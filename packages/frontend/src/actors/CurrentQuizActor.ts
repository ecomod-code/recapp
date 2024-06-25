import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import {
	Quiz,
	Comment,
	QuizActorMessages,
	QuizUpdateMessage,
	CommentUpdateMessage,
	Id,
	User,
	CommentActorMessages,
	toId,
	QuestionUpdateMessage,
	Question,
	QuestionActorMessages,
	QuestionDeletedMessage,
	CommentDeletedMessage,
	UserStoreMessages,
	QuizRunActorMessages,
	QuizRun,
	QuizRunUpdateMessage,
	QuizRunDeletedMessage,
	StatisticsUpdateMessage,
	StatisticsDeletedMessage,
	TextElementStatistics,
	ChoiceElementStatistics,
	GroupStatistics,
	StatisticsActorMessages,
	TextAnswer,
	ChoiceAnswer,
} from "@recapp/models";
import { Unit, seconds, toTimestamp, unit } from "itu-utils";
import { Maybe, maybe, nothing } from "tsmonads";
import { i18n } from "@lingui/core";
import { actorUris } from "../actorUris";
import unionize, { UnionOf, ofType } from "unionize";
import { isMultiChoiceAnsweredCorrectly, shuffle } from "../utils";

export const CurrentQuizMessages = unionize(
	{
		CreateQuiz: ofType<Id>(),
		SetUser: ofType<User>(),
		SetQuiz: ofType<Id>(),
		Activate: ofType<{ userId: Id; quizId: Id }>(),
		UpvoteComment: ofType<Id>(),
		FinishComment: ofType<Id>(),
		AddComment: ofType<Omit<Comment, "uid" | "authorId">>(),
		AddQuestion: ofType<{
			question: Omit<Question, "uid" | "authorName" | "authorId" | "created" | "updated">;
			group: string;
		}>(),
		DeleteQuestion: ofType<Id>(),
		DeleteComment: ofType<Id>(),
		GetTeacherNames: {},
		Update: ofType<Partial<Quiz>>(),
		UpdateQuestion: ofType<{ question: Partial<Question> & { uid: Id }; group: string }>(),
		setIsCommentSectionVisible: ofType<boolean>(),
		ChangeState: ofType<"EDITING" | "STARTED" | "STOPPED" | "RESETSTATS">(),
		StartQuiz: {}, // Start quiz for a participating student
		LogAnswer: ofType<{ questionId: Id; answer: string | boolean[] }>(), // Sets the answer for the current quiz question, returns whether the answer was correct
		ActivateQuestionStats: ofType<Id>(),
		ActivateGroupStats: ofType<string>(),
		ActivateQuizStats: {},
		Export: {},
		ExportQuizStats: {},
		ExportQuestionStats: {},
		ExportDone: {},
		LeaveQuiz: {}, // Remove yourself from the quiz, regardless whether you are a teacher or student
		GetRun: {},
	},
	{ value: "value" }
);

export type CurrentQuizMessage = UnionOf<typeof CurrentQuizMessages>;

type MessageType =
	| QuizUpdateMessage
	| CommentUpdateMessage
	| QuestionUpdateMessage
	| CurrentQuizMessage
	| QuestionDeletedMessage
	| CommentDeletedMessage
	| QuizRunUpdateMessage
	| QuizRunDeletedMessage
	| StatisticsUpdateMessage
	| StatisticsDeletedMessage;

export type CurrentQuizState = {
	quiz: Quiz;
	comments: Comment[];
	questions: Question[];
	questionStats: TextElementStatistics | ChoiceElementStatistics | undefined;
	groupStats: GroupStatistics | undefined;
	isCommentSectionVisible: boolean;
	quizStats: GroupStatistics | undefined;
	teacherNames: string[];
	run?: QuizRun;
	exportFile?: string;
};

export class CurrentQuizActor extends StatefulActor<MessageType, Unit | boolean | QuizRun, CurrentQuizState> {
	private quiz: Maybe<Id> = nothing();
	private user: Maybe<User> = nothing();

	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = {
			quiz: {} as Quiz,
			comments: [],
			questions: [],
			teacherNames: [],
			questionStats: undefined,
			groupStats: undefined,
			isCommentSectionVisible: false,
			quizStats: undefined,
			run: undefined,
			exportFile: undefined,
		};
	}

	private async handleRemoteUpdates(message: MessageType): Promise<Maybe<CurrentQuizMessage>> {
		console.log("CURRENTQUIZ MESSAGE", message);
		if (message.tag === "QuizUpdateMessage") {
			if (message.quiz.uid !== this.quiz.orElse(toId("-"))) {
				return nothing();
			}
			this.updateState(draft => {
				draft.quiz = { ...draft.quiz, ...message.quiz };
			});
			if (message.quiz.teachers) {
				this.send(this.ref, CurrentQuizMessages.GetTeacherNames(message.quiz.teachers));
			}
			if (message.quiz.state === "STARTED" && !this.state.run) {
				this.send(this.ref, CurrentQuizMessages.StartQuiz());
			}
			return nothing();
		} else if (message.tag === "CommentUpdateMessage") {
			this.updateState(draft => {
				draft.comments = draft.comments.filter(u => u.uid != message.comment.uid);
				draft.comments.push(message.comment as Comment);
				draft.comments.sort((a, b) => a.uid.localeCompare(b.uid));
			});
			return nothing();
		} else if (message.tag === "QuestionUpdateMessage") {
			this.updateState(draft => {
				draft.questions = draft.questions.filter(u => u.uid != message.question.uid);
				draft.questions.push(message.question as Question);
				draft.questions.sort((a, b) => a.uid.localeCompare(b.uid));
			});
			return nothing();
		} else if (message.tag === "QuestionDeletedMessage") {
			this.updateState(draft => {
				draft.questions = draft.questions.filter(u => u.uid != message.id);
			});
			return nothing();
		} else if (message.tag === "CommentDeletedMessage") {
			this.updateState(draft => {
				draft.comments = draft.comments.filter(u => u.uid != message.id);
			});
			return nothing();
		} else if (message.tag === "QuizRunUpdateMessage") {
			if (message.run.quizId === this.quiz.orElse(toId("-"))) {
				if (!this.state.questionStats) {
					this.send(this.ref, CurrentQuizMessages.ActivateQuizStats());
				} else {
					this.send(this.ref, CurrentQuizMessages.ActivateQuestionStats(this.state.questionStats.questionId));
				}
			}
			if (message.run.studentId !== this.user.map(u => u.uid).orElse(toId(""))) {
				// Update is not meant for us
				return nothing();
			}
			this.updateState(draft => {
				draft.run = { ...draft.run, ...message.run } as QuizRun;
			});
			return nothing();
		} else if (message.tag === "QuizRunDeletedMessage") {
			this.updateState(draft => {
				draft.run = undefined;
			});
			return nothing();
		} else if (message.tag === "StatisticsUpdateMessage") {
			if (message.stats.questionId === this.state.questionStats?.questionId) {
				this.updateState(draft => {
					draft.questionStats = { ...draft.questionStats, ...message.stats } as
						| TextElementStatistics
						| ChoiceElementStatistics;
				});
				return nothing();
			} else if (this.state.groupStats && message.stats.groupName === this.state.groupStats.groupName) {
				this.getGroupStats(this.state.groupStats.groupName);
			} else if (this.state.quizStats) {
				this.getQuizStats();
			}
			return nothing();
		} else if (message.tag === "StatisticsDeletedMessage") {
			this.updateState(draft => {
				draft.questionStats = undefined;
				draft.quizStats = undefined;
				draft.groupStats = undefined;
			});
			return nothing();
		}
		return maybe(message);
	}

	private getGroupStats = async (name: string) => {
		const gs: GroupStatistics = await this.ask(
			`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
			StatisticsActorMessages.GetForGroup(name)
		);
		this.updateState(draft => {
			draft.groupStats = gs;
		});
	};

	private getQuizStats = async () => {
		const gs: GroupStatistics = await this.ask(
			`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
			StatisticsActorMessages.GetForQuiz()
		);
		this.updateState(draft => {
			draft.quizStats = gs;
		});
	};

	private getQuestionStats = async (id: Id) => {
		const gs: TextElementStatistics | ChoiceElementStatistics = await this.ask(
			`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
			StatisticsActorMessages.GetForQuestion(id)
		);
		this.updateState(draft => {
			draft.questionStats = gs;
		});
	};

	async receive(_from: ActorRef, message: MessageType): Promise<Unit | boolean | QuizRun> {
		const maybeLocalMessage = await this.handleRemoteUpdates(message);
		try {
			// Deal with local messages
			return maybeLocalMessage
				.map(m =>
					CurrentQuizMessages.match<Promise<Unit | boolean | QuizRun>>(m, {
						GetRun: async () => {
							const studentId: Id = this.user.map(u => u.uid).orElse(toId(""));
							const quizId: Id = this.quiz.orElse(toId(""));
							const run = await this.ask(
								actorUris.QuizActor,
								QuizActorMessages.GetUserRun({ studentId, quizId })
							);
							return run as QuizRun;
						},
						Activate: async ({ userId, quizId }) => {
							const quiz: Quiz = await this.ask(actorUris.QuizActor, QuizActorMessages.Get(quizId));
							const students = quiz.students;
							if (!quiz.teachers.includes(userId) && !quiz.students.includes(userId)) {
								students.push(userId);
								this.send(actorUris.QuizActor, QuizActorMessages.Update({ uid: quizId, students }));
								this.send(actorUris.QuizActor, QuizActorMessages.SubscribeTo(quizId));
							}
							return unit();
						},
						StartQuiz: async () => {
							const studentId: Id = this.user.map(u => u.uid).orElse(toId(""));
							let questions = this.state.quiz.groups.reduce(
								(q, group) => [...q, ...group.questions],
								[] as Id[]
							);

							// Die Fragen sollten hier in Reihenfolge stehen. Falls wir das mischen müssen, passiert das jetzt.
							if (this.state.quiz.shuffleQuestions) {
								const randomShuffle = shuffle(Math.random);
								questions = randomShuffle(questions);
							}

							console.log("ORDER", questions);

							const run: QuizRun = await this.ask(
								`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
								QuizRunActorMessages.GetForUser({ studentId, questions })
							);
							this.updateState(draft => {
								draft.run = run;
							});

							console.log("NEW ORDER", run.questions);
							return unit();
						},
						LogAnswer: async ({ questionId, answer }) => {
							if (this.state.run) {
								const cleanedAnswers = typeof answer === "string" ? answer : answer.map(a => !!a);
								const answers = [...this.state.run.answers, cleanedAnswers];
								const question = this.state.questions.find(q => q.uid === questionId)!;
								let answerCorrect = false;
								if (question.type === "TEXT") {
									if (answer.length > 0) {
										answerCorrect = true;
									}
								} else {
									answerCorrect = isMultiChoiceAnsweredCorrectly(
										cleanedAnswers as boolean[],
										question
									);
									// answerCorrect = (cleanedAnswers as boolean[])
									// 	.map((a, i) => a === question.answers[i].correct)
									// 	.every(Boolean);

									// Sonderbehandlung Single/Multi Choice - wir erhalten bei keiner Antwort ein leeres Array
									if (cleanedAnswers.length === 0) {
										answerCorrect = question.answers.every(a => !a.correct);
									}
								}
								const correct = [...this.state.run.correct, answerCorrect];

								this.send(
									`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuizRunActorMessages.Update({
										uid: this.state.run.uid,
										answers,
										counter: this.state.run.counter + 1,
										correct,
									})
								);

								// Log stats
								let stat: TextAnswer | ChoiceAnswer | undefined = undefined;
								if (question.type === "TEXT") {
									stat = {
										tag: "TextAnswer",
										questionId,
										groupName:
											this.state.quiz.groups.find(g => g.questions.includes(questionId))?.name ??
											"DEFAULT",
										answer: answer.toString(),
										maxParticipants: this.state.quiz.students.length,
									};
								} else {
									stat = {
										tag: "ChoiceAnswer",
										questionId,
										groupName:
											this.state.quiz.groups.find(g => g.questions.includes(questionId))?.name ??
											"DEFAULT",
										maxParticipants: this.state.quiz.students.length,
										choices: answer as boolean[],
										correct: answerCorrect,
									};
								}
								this.send(
									`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
									StatisticsActorMessages.Update(stat)
								);
							}
							return unit();
						},
						ChangeState: async newState => {
							if (newState === "STARTED") {
								if (["ACTIVE", "EDITING", "STOPPED"].includes(this.state.quiz.state)) {
									this.send(
										actorUris.QuizActor,
										QuizActorMessages.Update({
											uid: this.state.quiz.uid,
											state: "STARTED",
										})
									);
								}
							} else if (newState === "STOPPED") {
								if (["STARTED", "EDITING"].includes(this.state.quiz.state)) {
									this.send(
										actorUris.QuizActor,
										QuizActorMessages.Update({ uid: this.state.quiz.uid, state: "STOPPED" })
									);
								}
							} else if (newState === "EDITING") {
								if (this.state.quiz.state !== "EDITING") {
									this.send(
										`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuestionActorMessages.Unstall()
									);
									this.send(
										actorUris.QuizActor,
										QuizActorMessages.Update({
											uid: this.state.quiz.uid,
											state: "EDITING",
										})
									);
									this.send(
										`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuizRunActorMessages.Clear()
									);
									this.send(
										`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
										StatisticsActorMessages.Clear()
									);
								}
							} else if (newState === "RESETSTATS") {
								if (this.state.quiz.state !== "STARTED") {
									this.send(
										`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuizRunActorMessages.Clear()
									);
									this.send(
										`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
										StatisticsActorMessages.Clear()
									);
								}
							}

							return unit();
						},
						CreateQuiz: async creator => {
							const quizData: Omit<Quiz, "uid" | "uniqueLink"> = {
								title: i18n._("new-quiz-title"),
								description: i18n._("new-quiz-description"),
								state: "EDITING",
								groups: [{ name: i18n._("new-quiz-group"), questions: [] }],
								studentQuestions: true,
								studentParticipationSettings: { ANONYMOUS: true, NAME: true, NICKNAME: true },
								allowedQuestionTypesSettings: { MULTIPLE: true, SINGLE: true, TEXT: true },
								shuffleQuestions: false,
								studentComments: true,
								teachers: [creator],
								students: [],
								created: toTimestamp(),
								updated: toTimestamp(),
								comments: [],
								hideComments: false,
							};
							const quizUid: Id = await this.ask(actorUris.QuizActor, QuizActorMessages.Create(quizData));
							this.send(this.ref, CurrentQuizMessages.SetQuiz(quizUid));
							return unit();
						},
						AddComment: async comment => {
							this.user.map(async u => {
								const comments = this.state.quiz.comments ? [...this.state.quiz.comments] : [];
								const uid: Id = await this.ask(
									`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
									CommentActorMessages.Create({
										authorId: u.uid,
										...comment,
									})
								);
								comments.push(uid);
								this.send(this.ref, CurrentQuizMessages.Update({ comments: comments }));
							});
							return unit();
						},
						DeleteComment: async id => {
							await this.ask(
								`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
								CommentActorMessages.Delete(id)
							);
							return unit();
						},
						DeleteQuestion: async id => {
							// Question also needs to be deleted from the groups of the quiz
							const groups = this.state.quiz.groups.map(g => {
								g.questions = g.questions.filter(q => q !== id);
								return g;
							});
							await this.send(
								actorUris.QuizActor,
								QuizActorMessages.Update({ uid: this.state.quiz.uid, groups })
							);
							await this.ask(
								`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
								QuestionActorMessages.Delete(id)
							);
							return unit();
						},
						AddQuestion: async ({ question, group }) => {
							question.editMode = false;
							try {
								await this.user.map(async u => {
									if (this.state.quiz.teachers.includes(u.uid)) {
										console.debug("Auto-approving question");
										question.approved = true; // Teacher questions are automatically approved
									}
									console.log("CURRENTQUIZ", "Creating question for user", u.uid);
									const uid: Id = await this.ask(
										`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuestionActorMessages.Create({
											authorId: u.uid,
											...question,
										})
									);
									if (uid.toString() === "") {
										// TODO Creatng the question failed.
										console.error("Failed to create new question", question);
										return;
									}
									const groups = this.state.quiz.groups;
									const addTo = groups.find(g => g.name === group);
									if (addTo) {
										addTo.questions.push(uid);
										addTo.questions = addTo.questions.filter(q => q !== "");
										this.send(this.actorRef!, CurrentQuizMessages.Update({ groups }));
									}
								});
							} catch (e) {
								alert(e);
								throw e;
							}
							return unit();
						},
						UpdateQuestion: async ({ question, group }) => {
							if (!question.uid) {
								console.error("Failed to update question without id", question);
								return unit();
							}
							if (!question.editMode) {
								question.editMode = false;
							}
							this.send(
								`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
								QuestionActorMessages.Update(question)
							);
							if (!group) {
								return unit();
							}
							const groups = this.state.quiz.groups.map(g => {
								if (g.questions.includes(question.uid)) {
									g.questions = g.questions.filter(q => q !== question.uid);
								}
								return g;
							});
							const addTo = groups.find(g => g.name === group);
							addTo?.questions.push(question.uid);
							this.send(this.actorRef!, CurrentQuizMessages.Update({ groups }));
							return unit();
						},
						setIsCommentSectionVisible: async visible => {
							this.updateState(draft => {
								draft.isCommentSectionVisible = visible;
							});
							return unit();
						},

						// MARK Comments
						FinishComment: async uid => {
							this.send(
								`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
								CommentActorMessages.Update({
									uid,
									answered: !this.state.comments.find(c => c.uid === uid)?.answered,
								})
							);
							return unit();
						},
						UpvoteComment: async commentId => {
							this.user.forEach(u => {
								this.send(
									`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
									CommentActorMessages.Upvote({
										commentId,
										userId: u.uid,
									})
								);
							});
							return unit();
						},
						SetUser: async user => {
							this.user = maybe(user);
							this.quiz.forEach(q => {
								this.send(this.actorRef!, CurrentQuizMessages.SetQuiz(q));
							});
							return unit();
						},
						SetQuiz: async uid => {
							try {
								if (uid === this.state.quiz.uid) {
									return unit();
								}
								this.state = { ...this.state, comments: [], questions: [] };
								this.quiz.forEach(q => {
									this.send(actorUris.QuizActor, QuizActorMessages.UnsubscribeFrom(q));
								});
								this.quiz.forEach(q => {
									this.send(
										`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
										CommentActorMessages.UnsubscribeFromCollection()
									);
									this.send(
										`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuestionActorMessages.UnsubscribeFromCollection()
									);
									this.send(
										`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuizRunActorMessages.UnsubscribeFromCollection()
									);
									this.send(
										`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
										StatisticsActorMessages.UnsubscribeFromCollection()
									);
								});
								this.quiz = maybe(uid);
								const quizData: Quiz = await this.ask(actorUris.QuizActor, QuizActorMessages.Get(uid));
								this.send(this.ref, CurrentQuizMessages.GetTeacherNames(quizData.teachers));
								this.send(
									`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
									CommentActorMessages.GetAll()
								);
								this.send(
									`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuestionActorMessages.GetAll()
								);
								this.updateState(draft => {
									draft.run = undefined;
									draft.questionStats = undefined;
									draft.groupStats = undefined;
									draft.quizStats = undefined;
									draft.quiz = quizData;
								});
								this.send(actorUris.QuizActor, QuizActorMessages.SubscribeTo(uid));
								this.send(
									`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
									CommentActorMessages.SubscribeToCollection()
								);
								this.send(
									`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuestionActorMessages.SubscribeToCollection()
								);
								this.send(
									`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuizRunActorMessages.SubscribeToCollection()
								);
								this.send(
									`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
									StatisticsActorMessages.SubscribeToCollection()
								);
								if (quizData.state === "STARTED") {
									this.send(this.ref, CurrentQuizMessages.StartQuiz());
								}
								this.send(this.ref, CurrentQuizMessages.ActivateQuizStats());
							} catch (e) {
								console.error(e);
							}
							return unit();
						},
						Update: async quiz => {
							this.send(
								actorUris.QuizActor,
								QuizActorMessages.Update({ uid: this.state.quiz.uid, ...quiz })
							);
							return unit();
						},
						GetTeacherNames: async () => {
							const names: any[] = await this.ask(
								actorUris.UserStore,
								UserStoreMessages.GetNames(this.state.quiz.teachers)
							);
							this.updateState(draft => {
								draft.teacherNames = names.map(n =>
									n.nickname ? `${n.username} (${n.nickname})` : n.username
								) as string[];
							});
							return unit();
						},
						// MARK: Activate statistics
						ActivateGroupStats: async name => {
							this.updateState(draft => {
								draft.questionStats = undefined;
								draft.quizStats = undefined;
							});
							this.getGroupStats(name);
							return unit();
						},
						ActivateQuizStats: async () => {
							this.updateState(draft => {
								draft.questionStats = undefined;
								draft.groupStats = undefined;
							});
							this.getQuizStats();
							return unit();
						},
						ActivateQuestionStats: async id => {
							this.updateState(draft => {
								draft.questionStats = undefined;
								draft.quizStats = undefined;
							});
							this.getQuestionStats(id);
							return unit();
						},
						Export: async () => {
							const filename: string | Error = await this.ask(
								actorUris.QuizActor,
								QuizActorMessages.Export(this.quiz.orElse(toId(""))),
								seconds(10).valueOf()
							);
							if (typeof filename === "string") {
								this.updateState(draft => {
									draft.exportFile = filename;
								});
							} else {
								console.error(filename);
							}
							return unit();
						},
						ExportQuizStats: async () => {
							const filename: string | Error = await this.ask(
								`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
								StatisticsActorMessages.ExportQuizStats(),
								seconds(10).valueOf()
							);
							if (typeof filename === "string") {
								this.updateState(draft => {
									draft.exportFile = filename;
								});
							} else {
								console.error(filename);
							}
							return unit();
						},
						ExportQuestionStats: async () => {
							const filename: string | Error = await this.ask(
								`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
								StatisticsActorMessages.ExportQuestionStats(),
								seconds(10).valueOf()
							);
							if (typeof filename === "string") {
								this.updateState(draft => {
									draft.exportFile = filename;
								});
							} else {
								console.error(filename);
							}
							return unit();
						},
						ExportDone: async () => {
							this.updateState(draft => {
								draft.exportFile = undefined;
							});
							return unit();
						},
						LeaveQuiz: async () => {
							const userId = this.user.map(u => u.uid).orElse(toId(""));
							if (userId === this.state.quiz.teachers[0]) {
								// If you created the quiz you cannot leave it
								return unit();
							}
							const teachers = this.state.quiz.teachers.filter(t => t !== userId);
							const students = this.state.quiz.students.filter(s => s !== userId);
							this.send(
								actorUris.QuizActor,
								QuizActorMessages.Update({
									uid: this.state.quiz.uid,
									teachers,
									students,
								})
							);
							return unit();
						},
					})
				)
				.orElse(Promise.resolve(unit()));
		} catch (e) {
			console.error(e);
			throw e;
		}
	}
}
