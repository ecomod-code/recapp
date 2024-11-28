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
import { v4 } from "uuid";
import { maybe } from "tsmonads";

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

	public async receive(from: ActorRef, message: QuizRunActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
			return unit();
		}
		console.log("QUIZRUNACTOR", from.name, JSON.stringify(message, undefined, 4));
		try {
			return await QuizRunActorMessages.match<Promise<ResultType>>(message, {
				GetForUser: async ({ studentId, questions }) => {
					const db = await this.connector.db();
					const mbRunId = maybe(
						await db
							.collection<QuizRun>(this.collectionName)
							.findOne({ studentId, quizId: this.uid }, { uid: 1, _id: 0 } as any)
					);
					const result = mbRunId.match<Promise<QuizRun | Error>>(
						async runId => {
							const run = await this.getEntity(runId.uid);
							console.log("Found existing run", run);
							return run.match<QuizRun | Error>(identity, () => new Error());
						},
						async () => {
							if (questions.length === 0) return undefined as any;
							const run: QuizRun = {
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
							await this.storeEntity(run);
							for (const [subscriber, subscription] of this.state.collectionSubscribers) {
								this.send(
									subscriber,
									new QuizRunUpdateMessage(
										subscription.properties.length > 0 ? pick(subscription.properties, run) : run
									)
								);
							}
							console.log("Created new run", run);
							return run;
						}
					);
					return result;
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
					console.warn(result);
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
			console.error(e);
			throw e;
		}
	}
}
