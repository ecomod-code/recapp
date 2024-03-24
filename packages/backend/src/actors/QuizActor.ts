import {
	ActorUri,
	Id,
	Quiz,
	QuizActorMessage,
	QuizActorMessages,
	QuizUpdateMessage,
	quizSchema,
	toId,
} from "@recapp/models";
import { SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, toTimestamp, unit } from "itu-utils";
import { CommentActor } from "./CommentActor";
import { maybe } from "tsmonads";
import { create } from "mutative";
import { identity, pick } from "rambda";
import { v4 } from "uuid";
import { QuestionActor } from "./QuestionActor";

type State = {
	cache: Map<Id, Quiz>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, string[]>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

type ResultType = any;

/**
 * Actor representing a quiz. Will also start a child actors for quiz comments
 */
export class QuizActor extends SubscribableActor<Quiz, QuizActorMessage, ResultType> {
	private commentActors = new Map<Id, ActorRef>();
	private questionActors = new Map<Id, ActorRef>();
	// private questionActors = new Map<Id, ActorRef>();

	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
	};

	protected override updateIndices(_draft: State, _quiz: Quiz): void {
		return;
	}

	constructor(name: string, system: ActorSystem) {
		super(name, system, "quizzes");
	}

	protected override async afterEntityWasCached(uid: Id) {
		if (!this.commentActors.has(uid)) {
			const comments = await this.system.createActor(
				CommentActor,
				{ name: `Comment_${uid}`, parent: this.ref, strategy: "Restart" },
				uid
			);
			this.logger.debug(`Comments actor ${comments.name} created`);
			this.commentActors.set(uid, comments);
		}
		if (!this.questionActors.has(uid)) {
			const questions = await this.system.createActor(
				QuestionActor,
				{ name: `Question_${uid}`, parent: this.ref, strategy: "Restart" },
				uid
			);
			this.logger.debug(`Question actor ${questions.name} created`);
			this.questionActors.set(uid, questions);
		}
	}

	protected override async afterEntityRemovedFromCache(uid: Id) {
		maybe(this.commentActors.get(uid)).forEach(c => {
			this.removeChild(c);
			this.commentActors.delete(uid);
			this.questionActors.delete(uid);
		});
	}

	public async receive(from: ActorRef, message: QuizActorMessage): Promise<ResultType> {
		console.log("QUIZACTOR", from.name, message);
		try {
			const [clientUserRole, clientUserId] = await this.determineRole(from);
			return await QuizActorMessages.match<Promise<ResultType>>(message, {
				Create: async quiz => {
					if (!["ADMIN", "TEACHER"].includes(clientUserRole)) {
						return new Error("Unprivileged access to quiz creation");
					}
					const uid = toId(v4());
					(quiz as Quiz).uid = uid;
					(quiz as Quiz).uniqueLink = `/activate?quiz=${uid}`;
					const quizToCreate = quizSchema.parse(quiz);
					await this.afterEntityWasCached(uid);
					await this.storeEntity(quizToCreate);
					for (const [subscriber, properties] of this.state.collectionSubscribers) {
						this.send(
							subscriber,
							new QuizUpdateMessage(properties.length > 0 ? pick(properties, quizToCreate) : quizToCreate)
						);
					}
					for (const subscriber of this.state.subscribers.get(quizToCreate.uid) ?? new Set()) {
						this.send(subscriber, new QuizUpdateMessage(quizToCreate));
					}
					return uid;
				},
				AddTeacher: async ({ quiz, teacher }) => {
					const q = await this.getEntity(quiz);
					q.map(async entity => {
						entity.teachers.push(teacher);
						await this.storeEntity(entity);
						for (const [subscriber, properties] of this.state.collectionSubscribers) {
							this.send(
								subscriber,
								new QuizUpdateMessage(properties.length > 0 ? pick(properties, entity) : entity)
							);
						}
						for (const subscriber of this.state.subscribers.get(entity.uid) ?? new Set()) {
							this.send(subscriber, new QuizUpdateMessage(entity));
						}
					});
				},
				AddStudent: async ({ quiz, student }) => {
					const q = await this.getEntity(quiz);
					q.map(async entity => {
						entity.students.push(student);
						await this.storeEntity(entity);
						for (const [subscriber, properties] of this.state.collectionSubscribers) {
							this.send(
								subscriber,
								new QuizUpdateMessage(properties.length > 0 ? pick(properties, entity) : entity)
							);
						}
						for (const subscriber of this.state.subscribers.get(entity.uid) ?? new Set()) {
							this.send(subscriber, new QuizUpdateMessage(entity));
						}
					});
				},
				RemoveUser: async ({ quiz, user }) => {
					const q = await this.getEntity(quiz);
					q.map(async entity => {
						entity.students = entity.students.filter(s => s !== user);
						entity.teachers = entity.teachers.filter(s => s !== user);
						await this.storeEntity(entity);
						for (const [subscriber, properties] of this.state.collectionSubscribers) {
							this.send(
								subscriber,
								new QuizUpdateMessage(properties.length > 0 ? pick(properties, entity) : entity)
							);
						}
						for (const subscriber of this.state.subscribers.get(entity.uid) ?? new Set()) {
							this.send(subscriber, new QuizUpdateMessage(entity));
						}
					});
				},
				Get: async uid => {
					const quiz = await this.getEntity(uid);
					return quiz.match<Quiz | Error>(identity, () => new Error());
				},
				Has: async uid => {
					const quiz = await this.getEntity(uid);
					return quiz.hasValue;
				},
				Update: async quiz => {
					const existingQuiz = await this.getEntity(quiz.uid);
					const result = await existingQuiz
						.map(async c => {
							if (!["TEACHER", "ADMIN"].includes(clientUserRole)) {
								return new Error("Invalid write access to quiz");
							}
							if (clientUserRole === "TEACHER" && !c.teachers.some(i => i === clientUserId)) {
								return new Error("Quiz not shared with teacher");
							}
							c.updated = toTimestamp();
							const { created, ...updateDelta } = quiz;
							console.log("DELTA", JSON.stringify(updateDelta, undefined, 4));
							const quizToUpdate = quizSchema.parse({ ...c, ...updateDelta });
							await this.storeEntity(quizToUpdate);
							for (const [subscriber, properties] of this.state.collectionSubscribers) {
								this.send(
									subscriber,
									new QuizUpdateMessage(
										properties.length > 0 ? pick(properties, quizToUpdate) : quizToUpdate
									)
								);
							}
							for (const subscriber of this.state.subscribers.get(quizToUpdate.uid) ?? new Set()) {
								this.send(subscriber, new QuizUpdateMessage(quizToUpdate));
							}
							return quizToUpdate;
						})
						.orElse(Promise.resolve(new Error("Quiz not found")));
					return result;
				},
				GetAll: async () => {
					const db = await this.connector.db();
					const quizzes = await db.collection<Quiz>(this.collectionName).find({}).toArray();
					quizzes.forEach(q => {
						const { _id, ...rest } = q;
						this.send(from, new QuizUpdateMessage(rest));
					});
					return unit();
				},
				SubscribeTo: async uid => {
					const maybeQuiz = await this.getEntity(uid);
					maybeQuiz.forEach(quiz => {
						if (
							!(
								quiz.teachers.some(i => i === clientUserId) ||
								quiz.students.some(i => i === clientUserId)
							)
						) {
							return; // No subscription for people who are not part of the quiz
						}
						this.state = create(this.state, draft => {
							const subscribers = draft.subscribers.get(uid) ?? new Set();
							subscribers.add(from.name as ActorUri);
							draft.subscribers.set(uid, subscribers);
							draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						});
					});
					return unit();
				},
				UnsubscribeFrom: async uid => {
					this.state = create(this.state, draft => {
						const subscribers = draft.subscribers.get(uid) ?? new Set();
						subscribers.delete(from.name as ActorUri);
						draft.subscribers.set(uid, subscribers);
					});
					return unit();
				},
				SubscribeToCollection: async (requestedProperties: string[]) => {
					this.state = create(this.state, draft => {
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						draft.collectionSubscribers.set(from.name as ActorUri, requestedProperties);
					});
					return unit(); // TODO: Muss die Zuweisungen der Quizze berücksichtigen!
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
