import {
	ActorUri,
	Id,
	QuizRun,
	QuizRunActorMessage,
	QuizRunActorMessages,
	QuizRunDeletedMessage,
	QuizRunUpdateMessage,
	quizRunSchema,
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { create } from "mutative";
import { identity, pick } from "rambda";
import { logger } from "../logger";
import { v4 } from "uuid";

type State = {
	cache: Map<Id, QuizRun>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

type ResultType = Unit | Error | QuizRun | Id;

/**
 * Actor representing the comments of a single quiz. This will be started as a child of the corresponding quiz actor
 */
export class QuizRunActor extends SubscribableActor<QuizRun, QuizRunActorMessage, ResultType> {
	// private questionActors = new Map<Id, ActorRef>();

	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
	};

	protected override updateIndices(_draft: State, _quiz: QuizRun): void {
		return;
	}

	constructor(
		name: string,
		system: ActorSystem,
		private uid: Id
	) {
		super(name, system, "quizruns");
	}

	public override async beforeStart(): Promise<void> {
		try {
			const db = await this.connector.db();
			await db
				.collection<QuizRun>(this.collectionName)
				.createIndex({ studentId: 1, quizId: 1 }, { unique: true, name: "studentId_quizId_unique" });
		} catch (e) {
			// Pre-existing duplicate (studentId, quizId) docs from the prior race condition
			// will block this index creation. Continue without the index — the atomic upsert
			// is still narrower than the previous read-then-create. Deduplicate and re-deploy
			// to gain the strict guarantee.
			this.logger.warn(
				`QUIZRUNACTOR could not create unique index on (studentId, quizId): ${
					e instanceof Error ? e.message : String(e)
				}`
			);
		}
	}

	public async receive(from: ActorRef, message: QuizRunActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
			return unit();
		}
		// console.log("QUIZRUNACTOR", from.name, JSON.stringify(message, undefined, 4));
		this.logger.debug(
			`QUIZRUNACTOR from=${String((from as any)?.name ?? from)} ` +
			`type=${String((message as any)?.QuizRunActorMessage ?? (message as any)?.type ?? typeof message)}`
		);
		try {
			return await QuizRunActorMessages.match<Promise<ResultType>>(message, {
				GetForUser: async ({ studentId, questions }) => {
					if (questions.length === 0) return undefined as any;
					const db = await this.connector.db();
					const candidate: QuizRun = {
						uid: v4() as Id,
						studentId,
						quizId: this.uid,
						counter: 0,
						questions,
						answers: [],
						created: toTimestamp(),
						updated: toTimestamp(),
						correct: [],
						wrong: [],
					};
					// Atomic upsert. Replaces the previous findOne + conditional insert,
					// which allowed concurrent GetForUser calls to each create sibling
					// run documents (Question Reset / Repetition glitch root cause).
					const stored = (await db
						.collection<QuizRun>(this.collectionName)
						.findOneAndUpdate(
							{ studentId, quizId: this.uid },
							{ $setOnInsert: candidate },
							{ upsert: true, returnDocument: "after" }
						)) as unknown as QuizRun | null;
					if (!stored) {
						return new Error("Failed to upsert quiz run");
					}
					if (stored.uid === candidate.uid) {
						// We just inserted — notify collection subscribers using the
						// in-memory candidate object (avoids leaking MongoDB's _id field).
						for (const [subscriber, subscription] of this.state.collectionSubscribers) {
							this.send(
								subscriber,
								new QuizRunUpdateMessage(
									subscription.properties.length > 0
										? pick(subscription.properties, candidate)
										: candidate
								)
							);
						}
						this.logger.info(`QUIZRUNACTOR created new run`);
						return candidate;
					}
					const existing = await this.getEntity(stored.uid);
					this.logger.debug(`QUIZRUNACTOR returning existing run`);
					return existing.match<QuizRun | Error>(identity, () => new Error());
				},
				Update: async run => {
					const existingRun = await this.getEntity(run.uid);
					return existingRun
						.map(async existing => {
							run.updated = toTimestamp();
							const { quizId, created, studentId, ...updateDelta } = run;
							const runToUpdate = quizRunSchema.parse({ ...existing, ...updateDelta });
							await this.storeEntity(runToUpdate);
							for (const [subscriber, subscription] of this.state.collectionSubscribers) {
								if (runToUpdate.studentId === subscription.userId) {
									this.send(
										subscriber,
										new QuizRunUpdateMessage(
											subscription.properties.length > 0
												? pick(subscription.properties, runToUpdate)
												: runToUpdate
										)
									);
								}
							}
							for (const subscriber of this.state.subscribers.get(runToUpdate.uid) ?? new Set()) {
								this.send(subscriber, new QuizRunUpdateMessage(runToUpdate));
							}
							return runToUpdate as QuizRun | Error;
						})
						.orElse(Promise.resolve(new Error("Run not found")));
				},
				Clear: async () => {
					const db = await this.connector.db();
					const result = await db.collection<QuizRun>(this.collectionName).deleteMany({ quizId: this.uid });
					logger.warn(JSON.stringify(result));
					this.state.cache = new Map();
					this.state.subscribers.forEach(subscriberSet =>
						subscriberSet.forEach(subscriber => this.send(subscriber, new QuizRunDeletedMessage()))
					);
					this.state.subscribers = new Map();
					Array.from(this.state.collectionSubscribers.keys()).forEach(subscriber =>
						this.send(subscriber, new QuizRunDeletedMessage())
					);
					return unit();
				},
				SubscribeToCollection: async () => {
					this.state = create(this.state, draft => {
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						draft.collectionSubscribers.set(from.name as ActorUri, {
							properties: [],
							userId: clientUserId,
							userRole: clientUserRole,
						});
					});
					return unit();
				},
				UnsubscribeFromCollection: async () => {
					this.state = create(this.state, draft => {
						draft.collectionSubscribers.delete(from.name as ActorUri);
					});
					return unit();
				},
			});
		} catch (e) {
			logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
			throw e;
		}
	}
}
