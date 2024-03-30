import {
	ActorUri,
	Question,
	Id,
	QuestionActorMessage,
	QuestionActorMessages,
	QuestionUpdateMessage,
	questionSchema,
	toId,
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, Unit, minutes, toTimestamp, unit } from "itu-utils";
import { create } from "mutative";
import { pick } from "rambda";
import { v4 } from "uuid";
import { DateTime } from "luxon";
import { maybe } from "tsmonads";

type State = {
	cache: Map<Id, Question>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

type ResultType = Unit | Error | Question | Id;

const STALLED_QUESTION_INTERVAL = minutes(15);
const STALLED_QUESTION_CHECK_INTERVAL = minutes(5);

/**
 * Actor representing the comments of a single quiz. This will be started as a child of the corresponding quiz actor
 */
export class QuestionActor extends SubscribableActor<Question, QuestionActorMessage, ResultType> {
	private checkStalledQuestionsInterval: NodeJS.Timeout;

	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
	};

	protected override updateIndices(_draft: State, _quiz: Question): void {
		return;
	}

	private checkStalledQuestions = () => {
		// Remove questions that are blocked from editing, but seemed not be updated in the last STALLED_QUESTION_INTERVAL. (e.g. because a client lost the connection)
		const cutOff = toTimestamp(DateTime.utc().minus(STALLED_QUESTION_INTERVAL));
		const idsToReset = Array.from(this.state.cache.values())
			.filter(question => question.editMode && question.updated < cutOff)
			.map(q => q.uid);
		idsToReset.map(id => {
			maybe(this.state.cache.get(id)).forEach(question => this.storeEntity({ ...question, editMode: false }));
		});
	};

	constructor(
		name: string,
		system: ActorSystem,
		private uid: Id
	) {
		super(name, system, "questions");
		this.checkStalledQuestionsInterval = setInterval(
			this.checkStalledQuestions,
			STALLED_QUESTION_CHECK_INTERVAL.valueOf()
		);
	}

	public override async beforeShutdown(): Promise<void> {
		super.beforeShutdown();
		clearInterval(this.checkStalledQuestionsInterval);
	}

	public async receive(from: ActorRef, message: QuestionActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		console.debug("QUESTIONACTOR", from.name, message);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
		}
		try {
			return await QuestionActorMessages.match<Promise<ResultType>>(message, {
				Create: async question => {
					(question as Question).uid = toId(v4());
					(question as Question).created = toTimestamp();
					(question as Question).updated = toTimestamp();
					const questionToCreate = questionSchema.parse(question);
					await this.storeEntity(questionToCreate);
					for (const [subscriber, subscription] of this.state.collectionSubscribers) {
						this.send(
							subscriber,
							new QuestionUpdateMessage(
								subscription.properties.length > 0
									? pick(subscription.properties, questionToCreate)
									: questionToCreate
							)
						);
					}
					return questionToCreate.uid;
				},
				Update: async question => {
					const existingQuestion = await this.getEntity(question.uid);
					return existingQuestion
						.map(async c => {
							if (!["TEACHER", "ADMIN"].includes(clientUserRole) && clientUserId !== c.authorId) {
								return new Error("Invalid write access to comment");
							}
							c.updated = toTimestamp();
							const { quiz, created, authorId, authorName, ...updateDelta } = question;
							const questionToUpdate = questionSchema.parse({ ...c, ...updateDelta });
							await this.storeEntity(questionToUpdate);
							for (const [subscriber, subscription] of this.state.collectionSubscribers) {
								this.send(
									subscriber,
									new QuestionUpdateMessage(
										subscription.properties.length > 0
											? pick(subscription.properties, questionToUpdate)
											: questionToUpdate
									)
								);
							}
							for (const subscriber of this.state.subscribers.get(questionToUpdate.uid) ?? new Set()) {
								this.send(subscriber, new QuestionUpdateMessage(questionToUpdate));
							}
							return questionToUpdate;
						})
						.orElse(Promise.resolve(new Error("Question not found")));
				},
				GetAll: async () => {
					const db = await this.connector.db();
					const questions = await db
						.collection<Question>(this.collectionName)
						.find({ quiz: this.uid })
						.toArray();
					questions.forEach(question => {
						const { _id, ...rest } = question;
						this.send(from, new QuestionUpdateMessage(rest));
					});
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
			console.error("QUESTIONACTOR", e);
			throw e;
		}
	}
}
