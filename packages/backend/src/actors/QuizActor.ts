import {
	ActorUri,
	Id,
	Quiz,
	QuizActorMessage,
	QuizActorMessages,
	QuizUpdateMessage,
	UserStoreMessages,
	quizSchema,
	toId,
} from "@recapp/models";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { ActorRef, ActorSystem } from "ts-actors";
import { Timestamp, toTimestamp, unit } from "itu-utils";
import { CommentActor } from "./CommentActor";
import { maybe } from "tsmonads";
import { create } from "mutative";
import { identity, pick } from "rambda";
import { v4 } from "uuid";
import { QuestionActor } from "./QuestionActor";
import { createActorUri } from "../utils";
import { keys } from "rambda";
import { QuizRunActor } from "./QuizRunActor";
import { StatisticsActor } from "./StatisticsActor";
import { writeFile } from "fs/promises";
import * as path from "path";

type State = {
	cache: Map<Id, Quiz>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
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
	private runActors = new Map<Id, ActorRef>();
	private statisticsActors = new Map<Id, ActorRef>();

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
		// const maybeCommentActor = maybe(this.system.childrenOf(this.ref!).find(a => a.name.endsWith(`Comment_${uid}`)));
		// maybeCommentActor.forEach(ca => this.commentActors.set(uid, ca));
		try {
			if (!this.commentActors.has(uid)) {
				const comments = await this.system.createActor(
					CommentActor,
					{ name: `Comment_${uid}`, parent: this.ref, strategy: "Restart" },
					uid
				);
				this.logger.debug(`Comments actor ${comments.name} created`);
				this.commentActors.set(uid, comments);
			}
			// const maybeQuestionActor = maybe(
			//	this.system.childrenOf(this.ref!).find(a => a.name.endsWith(`Question_${uid}`))
			//);
			//maybeQuestionActor.forEach(ca => this.questionActors.set(uid, ca));
			if (!this.questionActors.has(uid)) {
				const questions = await this.system.createActor(
					QuestionActor,
					{ name: `Question_${uid}`, parent: this.ref, strategy: "Restart" },
					uid
				);
				this.logger.debug(`Question actor ${questions.name} created`);
				this.questionActors.set(uid, questions);
			}
			if (!this.runActors.has(uid)) {
				const quizRuns = await this.system.createActor(
					QuizRunActor,
					{ name: `QuizRun_${uid}`, parent: this.ref, strategy: "Restart" },
					uid
				);
				this.logger.debug(`Quiz run actor ${quizRuns.name} created`);
				this.runActors.set(uid, quizRuns);
			}
			if (!this.statisticsActors.has(uid)) {
				const stats = await this.system.createActor(
					StatisticsActor,
					{ name: `Stats_${uid}`, parent: this.ref, strategy: "Restart" },
					uid
				);
				this.logger.debug(`Stats actor ${stats.name} created`);
				this.runActors.set(uid, stats);
			}
		} catch (e) {
			this.logger.error(JSON.stringify(e));
		}
	}

	protected override async afterEntityRemovedFromCache(uid: Id) {
		maybe(this.commentActors.get(uid)).forEach(c => {
			this.removeChild(c);
			this.send(c, "SHUTDOWN");
			this.commentActors.delete(uid);
		});
		maybe(this.questionActors.get(uid)).forEach(c => {
			this.removeChild(c);
			this.send(c, "SHUTDOWN");
			this.questionActors.delete(uid);
		});
		maybe(this.runActors.get(uid)).forEach(c => {
			this.removeChild(c);
			this.send(c, "SHUTDOWN");
			this.runActors.delete(uid);
		});
		maybe(this.statisticsActors.get(uid)).forEach(c => {
			this.removeChild(c);
			this.send(c, "SHUTDOWN");
			this.statisticsActors.delete(uid);
		});
	}

	private sendUpdateToSubscribers = (update: Quiz) => {
		for (const [subscriber, subscription] of this.state.collectionSubscribers) {
			if (subscription.userRole === "STUDENT" && !update.students.includes(subscription.userId)) {
				continue;
			}
			if (
				subscription.userRole === "TEACHER" &&
				![...update.students, ...update.teachers].includes(subscription.userId)
			) {
				continue;
			}

			console.log("SUBSCRIPTION SEND", subscriber, subscription.userRole, update.students, update.teachers);

			const globalUpdateMessage = new QuizUpdateMessage(
				subscription.properties.length > 0 ? pick(subscription.properties, update) : update
			);

			this.send(subscriber, globalUpdateMessage);
		}
		for (const subscriber of this.state.subscribers.get(update.uid) ?? new Set()) {
			this.send(subscriber, new QuizUpdateMessage(update));
		}
	};

	public async receive(from: ActorRef, message: QuizActorMessage): Promise<ResultType> {
		console.log("QUIZACTOR", from.name, message);
		try {
			const [clientUserRole, clientUserId] = await this.determineRole(from);
			return await QuizActorMessages.match<Promise<ResultType>>(message, {
				Create: async quiz => {
					if (!["ADMIN", "TEACHER"].includes(clientUserRole)) {
						// Students can also create quizzes. This will automatically upgrade them to a teacher role
						this.send(
							createActorUri("UserStore"),
							UserStoreMessages.Update({ uid: clientUserId, role: "TEACHER" })
						);
					}
					const uid = toId(v4());
					(quiz as Quiz).uid = uid;
					(quiz as Quiz).uniqueLink = `/activate?quiz=${uid}`;
					(quiz as Quiz).created = toTimestamp();
					(quiz as Quiz).updated = toTimestamp();
					(quiz as Quiz).state = "EDITING";
					const quizToCreate = quizSchema.parse(quiz);
					await this.afterEntityWasCached(uid);
					await this.storeEntity(quizToCreate);
					this.sendUpdateToSubscribers(quizToCreate);
					return uid;
				},
				AddTeacher: async ({ quiz, teacher }) => {
					const q = await this.getEntity(quiz);
					q.map(async entity => {
						entity.teachers.push(teacher);
						await this.storeEntity(entity);
						this.sendUpdateToSubscribers(entity);
					});
				},
				AddStudent: async ({ quiz, student }) => {
					const q = await this.getEntity(quiz);
					q.map(async entity => {
						entity.students.push(student);
						await this.storeEntity(entity);
						this.sendUpdateToSubscribers(entity);
					});
				},
				RemoveUser: async ({ quiz, user }) => {
					const q = await this.getEntity(quiz);
					q.map(async entity => {
						entity.students = entity.students.filter(s => s !== user);
						entity.teachers = entity.teachers.filter(s => s !== user);
						await this.storeEntity(entity);
						this.sendUpdateToSubscribers(entity);
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
					console.log("UPDATING", JSON.stringify(existingQuiz), "WITH", JSON.stringify(quiz));
					const result = await existingQuiz
						.map(async c => {
							if (!(keys(quiz).length === 2)) {
								if (!quiz.students && !quiz.comments && !quiz.groups) {
									if (!["TEACHER", "ADMIN"].includes(clientUserRole)) {
										console.error(clientUserRole, "is not TEACHER or ADMIN");
										return new Error("Invalid write access to quiz");
									}
									if (clientUserRole === "TEACHER" && !c.teachers.some(i => i === clientUserId)) {
										console.error(clientUserId, "is not in teacher list", c.teachers, keys(quiz));
										return new Error("Quiz not shared with teacher");
									}
								}
							}
							c.updated = toTimestamp();
							const { created, ...updateDelta } = quiz;
							console.log("DELTA", JSON.stringify(updateDelta, undefined, 4));
							const quizToUpdate = quizSchema.parse({ ...c, ...updateDelta });
							await this.storeEntity(quizToUpdate);
							this.sendUpdateToSubscribers(quizToUpdate);
							return quizToUpdate;
						})
						.orElse(Promise.resolve(new Error("Quiz not found")));
					return result;
				},
				GetAll: async () => {
					const db = await this.connector.db();
					const quizzes = (await db.collection<Quiz>(this.collectionName).find({}).toArray()).filter(
						(q: Quiz) =>
							clientUserRole === "ADMIN" ||
							q.teachers.includes(clientUserId) ||
							q.students.includes(clientUserId) ||
							!q.archived
					);

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
								clientUserRole === "ADMIN" ||
								clientUserRole === "TEACHER" ||
								clientUserRole === "STUDENT" ||
								quiz.teachers.some(i => i === clientUserId) ||
								quiz.students.some(i => i === clientUserId)
							)
						) {
							console.error("DOnt subscribe", clientUserRole, quiz.students);
							return; // No subscription for people who are not part of the quiz
						}
						console.warn("Subscribe", clientUserId, clientUserRole);
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
						console.log("SUBSCRIBING TO QUIITES", from.name, clientUserId, clientUserRole);
						draft.collectionSubscribers.set(from.name as ActorUri, {
							properties: requestedProperties,
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
				Export: async uid => {
					const db = await this.connector.db();
					const mbQuiz = maybe(await db.collection<Quiz>(this.collectionName).findOne({ uid }));
					return mbQuiz.match<Promise<Error | string>>(
						async quiz => {
							console.log("EXPORTING", quiz);
							const exportObject: any = { ...quiz };
							exportObject.state = "EDITING";
							delete exportObject.lastExport;
							delete exportObject.teachers;
							delete exportObject.students;
							delete exportObject.comments;
							delete exportObject.uid;
							delete exportObject.uniqueLink;
							delete exportObject.uniqueLink;
							const questionIds = quiz.groups
								.map(group => group.questions)
								.flat()
								.filter(id => id !== toId(""));
							exportObject.questions = await Promise.all(
								questionIds.map(async id => {
									const question = await db.collection<any>("questions").findOne({ uid: id });
									if (question) {
										delete question?.authorId;
										delete question?.authorName;
									}
									return question;
								})
							);

							const exportTime = toTimestamp();
							const filename = `quiz_${quiz.uid}_${exportTime.value.toString()}.json`;

							await writeFile(
								path.join("./downloads", filename),
								JSON.stringify(exportObject, undefined, 2)
							);

							this.send(this.ref, QuizActorMessages.Update({ uid, lastExport: exportTime }));
							return filename;
						},
						async () => {
							return new Error("Unknown quiz");
						}
					);
				},
				default: async () => {
					this.logger.error(`Unknown message from ${from.name} in QuizActor: ${JSON.stringify(message)}`);
				},
			});
		} catch (e) {
			console.error(e);
			throw e;
		}
	}
}
