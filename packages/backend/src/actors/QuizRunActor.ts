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
import { pick } from "rambda";
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

	public async receive(from: ActorRef, message: QuizRunActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
		}
		console.log("QUIZRUNACTOR", from.name, message);
		try {
			return await QuizRunActorMessages.match<Promise<ResultType>>(message, {
				Create: async run => {
					(run as QuizRun).uid = v4() as Id;
					const runToCreate = quizRunSchema.parse(run);
					await this.storeEntity(runToCreate);
					for (const [subscriber, subscription] of this.state.collectionSubscribers) {
						this.send(
							subscriber,
							new QuizRunUpdateMessage(
								subscription.properties.length > 0
									? pick(subscription.properties, runToCreate)
									: runToCreate
							)
						);
					}
					for (const subscriber of this.state.subscribers.get(runToCreate.uid) ?? new Set()) {
						this.send(subscriber, new QuizRunUpdateMessage(runToCreate));
					}
					return runToCreate.uid;
				},
				Update: async run => {
					const existingRun = await this.getEntity(run.uid);
					return existingRun
						.map(async c => {
							run.updated = toTimestamp();
							const { quizId, created, studentId, ...updateDelta } = run;
							const runToUpdate = quizRunSchema.parse({ ...c, ...updateDelta });
							await this.storeEntity(runToUpdate);
							for (const [subscriber, subscription] of this.state.collectionSubscribers) {
								this.send(
									subscriber,
									new QuizRunUpdateMessage(
										subscription.properties.length > 0
											? pick(subscription.properties, runToUpdate)
											: runToUpdate
									)
								);
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
					await db.collection<QuizRun>(this.collectionName).deleteMany({ quizId: this.uid });
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
