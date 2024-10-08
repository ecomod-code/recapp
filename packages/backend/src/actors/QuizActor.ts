import {
	ActorUri,
	Id,
	Comment,
	Question,
	QuestionGroup,
	Quiz,
	QuizActorMessage,
	QuizActorMessages,
	QuizUpdateMessage,
	QuizDeletedMessage,
	UserStoreMessages,
	quizSchema,
	toId,
	QuizRun,
	User,
	UserRole,
	isInTeachersList,
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
import { writeFile, readFile } from "fs/promises";
import * as path from "path";
import { AccessRole } from "./StoringActor";
import { serializeError } from "serialize-error";

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

	private sendDeletionToSubscribers = (deletedId: Id) => {
		for (const [subscriber] of this.state.collectionSubscribers) {
			const globalUpdateMessage = new QuizDeletedMessage(deletedId);

			this.send(subscriber, globalUpdateMessage);
		}
		for (const subscriber of this.state.subscribers.get(deletedId) ?? new Set()) {
			this.send(subscriber, new QuizDeletedMessage(deletedId));
		}
	};

	private async create(quiz: Partial<Quiz>, clientUserRole: AccessRole, clientUserId: Id): Promise<Id> {
		if (!["ADMIN", "TEACHER"].includes(clientUserRole)) {
			// Students can also create quizzes. This will automatically upgrade them to a teacher role
			this.send(createActorUri("UserStore"), UserStoreMessages.Update({ uid: clientUserId, role: "TEACHER" }));
		}
		const uid = toId(v4());
		(quiz as Quiz).uid = uid;
		(quiz as Quiz).uniqueLink = `/activate?quiz=${uid}`;
		(quiz as Quiz).created = toTimestamp();
		(quiz as Quiz).updated = toTimestamp();
		(quiz as Quiz).state = "EDITING";
		(quiz as Quiz).createdBy = clientUserId;
		const quizToCreate = quizSchema.parse(quiz);
		await this.afterEntityWasCached(uid);
		await this.storeEntity(quizToCreate);
		this.sendUpdateToSubscribers(quizToCreate);
		return uid;
	}

	public async receive(from: ActorRef, message: QuizActorMessage): Promise<ResultType> {
		console.log("QUIZACTOR", from.name, message);
		try {
			const [clientUserRole, clientUserId] = await this.determineRole(from);
			return await QuizActorMessages.match<Promise<ResultType>>(message, {
				Create: async quiz => {
					return this.create(quiz, clientUserRole, clientUserId);
				},
				GetUserRun: async ({ studentId, quizId }) => {
					const db = await this.connector.db();
					const mbRun = maybe(await db.collection<QuizRun>("quizruns").findOne({ studentId, quizId }));
					console.warn("GETUSERRUN", { studentId, quizId }, mbRun);
					return mbRun.match(identity, () => new Error("No run for user"));
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
				Delete: async id => {
					const mbQuiz = await this.getEntity(id);
					return mbQuiz.map(async quiz => {
						if (
							clientUserRole !== "ADMIN" &&
							(quiz.createdBy ? quiz.createdBy !== clientUserId : quiz.teachers[0] !== clientUserId)
						) {
							this.logger.warn(
								`Cannot delete quiz. User ${clientUserId} is nor creating teacher nor admin (role: ${clientUserRole}).`
							);
							return new Error(
								`Cannot delete quiz. User ${clientUserId} is nor creating teacher nor admin (role: ${clientUserRole}).`
							);
						}
						const db = await this.connector.db();
						await this.deleteEntity(id);
						await this.state.cache.delete(id);
						await this.afterEntityRemovedFromCache(id);
						await db.collection<Question>("questions").deleteMany({ quiz: id });
						await db.collection<Comment>("comments").deleteMany({ relatedQuiz: id });
						this.logger.debug(`Successfully deleted quiz ${id}`);
						this.sendDeletionToSubscribers(id);
						return unit();
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
								if (!quiz.students && !quiz.comments && !quiz.groups && !quiz.previewers) {
									if (!["TEACHER", "ADMIN"].includes(clientUserRole)) {
										console.error(clientUserRole, "is not TEACHER or ADMIN");
										return new Error("Invalid write access to quiz");
									}
									if (clientUserRole === "TEACHER" && !isInTeachersList(c, clientUserId)) {
										// } c.teachers.some(i => i === clientUserId)) {
										console.error(clientUserId, "is not in teacher list", c.teachers, keys(quiz));
										return new Error("Quiz not shared with teacher");
									}
								}
							}
							c.updated = toTimestamp();
							const { created, ...updateDelta } = quiz;
							const quizToUpdate = quizSchema.parse({ ...c, ...updateDelta });
							if (quiz.state && quiz.state !== "STOPPED") {
								delete quizToUpdate.archived;
							}
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
							q.students.includes(clientUserId) /*||
							!q.archived*/
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
				Import: async ({ filename, titlePrefix, userId, userRole }) => {
					console.log(filename);
					const jsonBuffer = await readFile(path.join("./downloads", filename));
					const importedObject = JSON.parse(jsonBuffer.toString());
					try {
						const propertyKeys = [
							"allowedQuestionTypesSettings",
							"description",
							"shuffleQuestions",
							"state",
							"studentComments",
							"studentParticipationSettings",
							"studentQuestions",
							"hideComments",
							"title",
							"questions",
						];
						const properties = keys(importedObject);
						if (propertyKeys.some(p => !properties.includes(p))) {
							throw new Error("Illegal import schema");
						}
					} catch (e) {
						if (e instanceof Error) {
							console.error(e);
							return serializeError(new Error(e.message));
						}
					}
					const quiz: Omit<Quiz, "uniqueLink" | "uid"> = {
						allowedQuestionTypesSettings: importedObject.allowedQuestionTypesSettings,
						description: importedObject.description,
						groups: [],
						shuffleQuestions: importedObject.shuffleQuestions,
						state: importedObject.state,
						studentComments: importedObject.studentComments,
						studentParticipationSettings: importedObject.studentParticipationSettings,
						studentQuestions: importedObject.studentQuestions,
						hideComments: importedObject.hideComments ?? false,
						title: titlePrefix ? `(${titlePrefix}) ${importedObject.title}` : importedObject.title,
						comments: [],
						teachers: [userId ?? clientUserId],
						students: [],
						created: toTimestamp(),
						updated: toTimestamp(),
						createdBy: userId ?? clientUserId,
						shuffleAnswers: false,
					};
					const uid = await this.create(quiz, userRole ?? clientUserRole, userId ?? clientUserId);
					const rawQuestions: Question[] = importedObject.questions;
					const questionOldIdToNewId = new Map<Id, Id>();
					const db = await this.connector.db();
					const userData: User = await this.ask(
						"actors://recapp-backend/UserStore",
						UserStoreMessages.Get(userId ?? clientUserId)
					);
					await Promise.all(
						rawQuestions.map(async (q: Question) => {
							const newId = toId(v4());
							questionOldIdToNewId.set(q.uid, newId);
							q.uid = newId;
							q.quiz = uid;
							q.authorId = userId ?? clientUserId;
							q.authorName = userData.username;
							q.created = toTimestamp();
							q.updated = toTimestamp();
							await db.collection("questions").insertOne(q);
						})
					);
					const groups: QuestionGroup[] = importedObject.groups;
					groups.forEach(g => {
						const newGroup: QuestionGroup = {
							name: g.name,
							questions: [],
						};
						g.questions.forEach(q => {
							const id = questionOldIdToNewId.get(q);
							if (id) {
								newGroup.questions.push(id);
							}
						});
						quiz.groups.push(newGroup);
					});
					this.send(this.ref, QuizActorMessages.Update({ uid, groups: quiz.groups }));
					return uid;
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
							delete exportObject._id;
							const questionIds = quiz.groups
								.map(group => group.questions)
								.flat()
								.filter(id => id !== toId(""));
							exportObject.questions = await Promise.all(
								questionIds.map(async id => {
									const question = await db.collection<any>("questions").findOne({ uid: id });
									if (question) {
										delete question.authorId;
										delete question.authorName;
										delete question._id;
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
				Duplicate: async uid => {
					try {
						const filename = (await this.ask(this.ref, QuizActorMessages.Export(uid))) as string | Error;
						if (typeof filename === "string") {
							const newQuizId = (await this.ask(
								this.ref,
								QuizActorMessages.Import({
									filename,
									titlePrefix: "DUP",
									userId: clientUserId,
									userRole: clientUserRole as UserRole,
								})
							)) as Id | Error;
							if (newQuizId instanceof Error) {
								throw new Error("Import failed");
							}
							return newQuizId;
						}
						throw new Error("Export failed");
					} catch {
						return new Error("Unknown quiz or corrupted quiz data");
					}
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
