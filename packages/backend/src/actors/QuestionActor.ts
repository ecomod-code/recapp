import {
	ActorUri,
	Question,
	Id,
	QuestionActorMessage,
	QuestionActorMessages,
	QuestionUpdateMessage,
	questionSchema,
	toId,
	QuestionDeletedMessage,
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, Unit, fromTimestamp, hours, minutes, toTimestamp, unit } from "itu-utils";
import { create } from "mutative";
import { pick } from "rambda";
import { v4 } from "uuid";
import { DateTime } from "luxon";

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

	private checkStalledQuestions = async () => {
		// Remove questions that are blocked from editing, but seemed not be updated in the last STALLED_QUESTION_INTERVAL. (e.g. because a client lost the connection)
		const cutOff = DateTime.utc().minus(STALLED_QUESTION_INTERVAL);
		await this.unstallQuestions(cutOff);
	};

	private unstallQuestions = async (cutOff: DateTime) => {
		// Remove questions that are blocked from editing, but seemed not be updated in the last STALLED_QUESTION_INTERVAL. (e.g. because a client lost the connection)
		const db = await this.connector.db();
		const candidates = await db
			.collection<Question>(this.collectionName)
			.find({ editMode: true, quiz: this.uid })
			.toArray();
		const idsToReset = Array.from(candidates)
			.filter(question => question.editMode && fromTimestamp(question.updated.value) < cutOff)
			.map(q => q.uid);
		console.log("QUESTIONACTOR - resetting the stalled questions", idsToReset);
		idsToReset.forEach(id =>
			this.ask(this.ref, QuestionActorMessages.Update({ uid: id, editMode: false }))
				.then(result => {
					console.log("UPDATESTALLED", result);
				})
				.catch(e => console.error(e))
		);
	};

	constructor(
		name: string,
		system: ActorSystem,
		private uid: Id
	) {
		super(name, system, "questions");
		this.checkStalledQuestionsInterval = setInterval(
			() => this.checkStalledQuestions(),
			STALLED_QUESTION_CHECK_INTERVAL.valueOf()
		);
		this.checkStalledQuestions();
	}

	public override async beforeShutdown(): Promise<void> {
		super.beforeShutdown();
		clearInterval(this.checkStalledQuestionsInterval);
	}

	public async receive(from: ActorRef, message: QuestionActorMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		// MARK: This is interesting
		console.debug("QUESTIONACTOR", from.name, message);
		if (typeof message === "string" && message === "SHUTDOWN") {
			this.shutdown();
			return unit();
		}
		try {
			return await QuestionActorMessages.match<Promise<ResultType>>(message, {
				// #region Message handling
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
				// MARK: Update
				Update: async question => {
					const existingQuestion = await this.getEntity(question.uid);
					return existingQuestion
						.map(async c => {
							if (
								!["SYSTEM", "TEACHER", "ADMIN"].includes(clientUserRole) &&
								clientUserId !== c.authorId
							) {
								return new Error("Invalid write access to comment");
							}
							c.updated = toTimestamp();
							// const { quiz, created, authorId, authorName, ...updateDelta } = question;
							const { quiz, created, authorId, ...updateDelta } = question;
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
				Unstall: async () => {
					const cutOff = DateTime.utc().minus(hours(5));
					await this.unstallQuestions(cutOff);
					return unit();
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
				Delete: async id => {
					const existingComment = await this.getEntity(id);
					return await existingComment
						.map(async c => {
							if (
								!["SYSTEM", "TEACHER", "ADMIN"].includes(clientUserRole) &&
								clientUserId !== c.authorId
							) {
								return new Error("Invalid write access to question");
							}

							await this.deleteEntity(id);
							for (const [subscriber] of this.state.collectionSubscribers) {
								this.send(subscriber, new QuestionDeletedMessage(id));
							}
							for (const subscriber of this.state.subscribers.get(id) ?? new Set()) {
								this.send(subscriber, new QuestionDeletedMessage(id));
							}
							return unit();
						})
						.orElse(Promise.resolve(unit()));
				},
			});
			//#endregion
		} catch (e) {
			console.error("QUESTIONACTOR unhandled error", message, e);
			throw e;
		}
	}
}
