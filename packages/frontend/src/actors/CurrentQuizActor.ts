import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import {
	Quiz,
	Comment,
	QuizActorMessages,
	QuizUpdateMessage,
	QuizDeletedMessage,
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
import { keys } from "rambda";
import { d } from "../utils/debugLog";
import { anonUserKey } from "../utils/hash";

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
		setIsPresentationModeActive: ofType<boolean>(),
		ChangeState: ofType<"EDITING" | "STARTED" | "STOPPED" | "RESETSTATS">(),
		StartQuiz: {}, // Start quiz for a participating student
		LogAnswer: ofType<{ questionId: Id; answer: string | boolean[] }>(), // Sets the answer for the current quiz question, returns whether the answer was correct
		ActivateQuestionStats: ofType<Id>(),
		ActivateGroupStats: ofType<string>(),
		ActivateQuizStats: {},
		Duplicate: {},
		Export: {},
		ExportQuizStats: {},
		ExportQuestionStats: {},
		ExportDone: {},
		LeaveQuiz: {}, // Remove yourself from the quiz, regardless whether you are a teacher or student
		GetRun: {},
		Reset: {},
	},
	{ value: "value" }
);

export type CurrentQuizMessage = UnionOf<typeof CurrentQuizMessages>;

type MessageType =
	| QuizUpdateMessage
	| QuizDeletedMessage
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
	isPresentationModeActive: boolean;
	quizStats: GroupStatistics | undefined;
	teacherNames: string[];
	run?: QuizRun;
	result?: QuizRun;
	exportFile?: string;
	deleted: boolean;
	// An answer selected before `run` finished (re)initialising. LogAnswer
	// buffers it here instead of silently dropping it, and it is replayed once
	// `run` and the question set are ready. See flushPendingAnswer().
	pendingAnswer?: { questionId: Id; answer: string | boolean[] };
	runReady: boolean;
	hasInitialQuestions: boolean;
	questionsSubscribed: boolean;
	runFetchStarted: boolean;
};

export class CurrentQuizActor extends StatefulActor<MessageType, Unit | boolean | QuizRun, CurrentQuizState> {
	// Override the ts-actors default ("Shutdown"). A long-lived session actor
	// shouldn't die from one handler exception (e.g. a timed-out ask raising
	// the string-rejection contract from DistributedActorSystem.js:41). The
	// supervisor still logs the warning + console.error; we just keep
	// processing the next message instead of freezing the page.
	strategy = "Resume" as const;

	private quiz: Maybe<Id> = nothing();
	private user: Maybe<User> = nothing();
	private firstListReported = false; // for debugging: emit a single LIST_RESULT when the list goes from 0 → N for the first time.

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
			isPresentationModeActive: false,
			quizStats: undefined,
			run: undefined,
			exportFile: undefined,
			deleted: false,
			pendingAnswer: undefined,
			runReady: false,
			hasInitialQuestions: false,
			questionsSubscribed: false,
			runFetchStarted: false,
		};
	}

	/**
	 * Replay an answer that arrived while `run` was undefined (buffered by
	 * LogAnswer's else branch). Called from every path that (re)initialises
	 * `run` and from the question-list update. It is a no-op unless the run and
	 * the answered question are both present, so calling it eagerly at several
	 * sites is safe regardless of the order in which run/questions settle. The
	 * buffer is cleared before re-dispatching so the answer applies exactly once
	 * and cannot re-enter this flush loop.
	 */
	private flushPendingAnswer(): void {
		const pending = this.state.pendingAnswer;
		if (!pending) return;
		if (!this.state.run) return;
		// LogAnswer requires the Question to be loaded (it reads question.type);
		// wait for the question set if it hasn't arrived yet.
		if (!this.state.questions.some(q => q.uid === pending.questionId)) return;
		this.updateState(s => {
			s.pendingAnswer = undefined;
		});
		this.send(this.ref, CurrentQuizMessages.LogAnswer(pending));
	}

	private async handleRemoteUpdates(message: MessageType): Promise<Maybe<CurrentQuizMessage>> {
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
				this.send(this.ref, CurrentQuizMessages.GetRun());
			}
			return nothing();
		} else if (message.tag === "QuizDeletedMessage") {
			// Ignore deletions for quizzes we're not currently watching — otherwise
			// any quiz deletion (e.g. from the dashboard list) would clear our state
			// and surface a misleading "quiz deleted" error.
			if (message.quizId !== this.quiz.orElse(toId("-"))) {
				return nothing();
			}
			// Proactively unsubscribe from the per-quiz collection actors before
			// the backend tears them down, so cleanup messages reach live targets
			// instead of producing "Unknown target" log noise.
			this.quiz.forEach(q => {
				this.send(actorUris.QuizActor, QuizActorMessages.UnsubscribeFrom(q));
				this.send(
					`${actorUris.CommentActorPrefix}${q}`,
					CommentActorMessages.UnsubscribeFromCollection()
				);
				this.send(
					`${actorUris.QuestionActorPrefix}${q}`,
					QuestionActorMessages.UnsubscribeFromCollection()
				);
				this.send(
					`${actorUris.QuizRunActorPrefix}${q}`,
					QuizRunActorMessages.UnsubscribeFromCollection()
				);
				this.send(
					`${actorUris.StatsActorPrefix}${q}`,
					StatisticsActorMessages.UnsubscribeFromCollection()
				);
			});
			this.updateState(draft => {
				draft.quiz = {} as Quiz;
				draft.deleted = true;
			});
			this.quiz = nothing();
			return nothing();
		} else if (message.tag === "CommentUpdateMessage") {
			this.updateState(draft => {
				draft.comments = draft.comments.filter(u => u.uid != message.comment.uid);
				draft.comments.push(message.comment as Comment);
				draft.comments.sort((a, b) => a.uid.localeCompare(b.uid));
			});
			return nothing();
		} else if (message.tag === "QuestionUpdateMessage") {
			const quizId = this.state.quiz.uid;
			const before = this.state.questions.length;
			let after = before;

			this.updateState(draft => {
				draft.questions = draft.questions.filter(u => u.uid != message.question.uid);
				draft.questions.push(message.question as Question);
				draft.questions.sort((a, b) => a.uid.localeCompare(b.uid));
				after = draft.questions.length;
			});

			const delta = after - before;
			d.wsDelta({ quizId, delta, totalAfter: after });

			if (!this.firstListReported && after > 0) {
				this.firstListReported = true;
				this.updateState(s => { s.hasInitialQuestions = true; });
				d.listRes({ quizId, source: "client", returnedCount: after });
			}

			// Questions just arrived; replay an answer buffered before run/questions
			// were ready (no-op unless run is set and the question is now present).
			this.flushPendingAnswer();

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
				const incomingCounter = (message.run as Partial<QuizRun>).counter;
				const beforeCounter = draft.run?.counter ?? null;
				const currentCounter = draft.run?.counter ?? 0;
				if (
					draft.run &&
					typeof incomingCounter === "number" &&
					incomingCounter < currentCounter
				) {
					// Defence-in-depth: a WS update carrying a counter lower than the
					// current (optimistic) state would regress run.counter and trigger
					// RunningQuizTab's useEffect, resetting answered/answers and either
					// re-enabling the previous question (repetition) or hiding the Next
					// button (reset). Ignore it.
					d.runState({
						source: "QuizRunUpdate",
						beforeCounter,
						afterCounter: beforeCounter,
						runUidBefore: draft.run?.uid,
						blocked: true,
						reason: "stale-counter",
					});
					return;
				}
				draft.run = { ...draft.run, ...message.run } as QuizRun;
				draft.result = { ...draft.result, ...message.run } as QuizRun;
				d.runState({
					source: "QuizRunUpdate",
					beforeCounter,
					afterCounter: draft.run?.counter ?? null,
					runUidBefore: draft.run?.uid,
					runUidAfter: draft.run?.uid,
				});
			});
			return nothing();
		} else if (message.tag === "QuizRunDeletedMessage") {
			this.updateState(draft => {
				d.runState({
					source: "QuizRunDeleted",
					beforeCounter: draft.run?.counter ?? null,
					afterCounter: null,
					runUidBefore: draft.run?.uid,
				});
				draft.run = undefined;
				draft.runFetchStarted = false;
				draft.pendingAnswer = undefined;
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
			`${actorUris.StatsActorPrefix}${this.state.quiz.uid}`,
			StatisticsActorMessages.GetForQuiz()
		);
		if (!gs.quizId) {
			return;
		}
		this.updateState(draft => {
			draft.quizStats = gs;
			draft.quiz.statistics = gs;
		});
		this.send(actorUris.QuizActor, QuizActorMessages.Update({ uid: this.state.quiz.uid, statistics: gs }));
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
		// Deal with local messages
		return maybeLocalMessage
			.map(m =>
				CurrentQuizMessages.match<Promise<Unit | boolean | QuizRun>>(m, {
						Reset: async () => {
							this.updateState(draft => {
								d.runState({
									source: "Reset",
									beforeCounter: draft.run?.counter ?? null,
									afterCounter: null,
									runUidBefore: draft.run?.uid,
								});
								draft.quiz = {} as Quiz;
								draft.comments = [];
								draft.questions = [];
								draft.teacherNames = [];
								draft.questionStats = undefined;
								draft.groupStats = undefined;
								draft.isCommentSectionVisible = false;
								draft.quizStats = undefined;
								draft.run = undefined;
								draft.exportFile = undefined;
								draft.deleted = false;
								draft.pendingAnswer = undefined;
								draft.runReady = false;
								draft.hasInitialQuestions = false;
								draft.questionsSubscribed = false;
								draft.runFetchStarted = false;
							});
							return unit();
						},
						GetRun: async () => {
							// Synchronous dedup. ts-actors does not serialize handler
							// invocations per actor (Actor.send dispatches via setTimeout +
							// RxJS Subject), so multiple GetRun messages queued by
							// SetQuiz + handleRemoteUpdates would otherwise all start
							// concurrent asks. The flag is set before the first await, so
							// JS run-to-completion guarantees later invocations see it.
							if (this.state.runFetchStarted) {
								return (this.state.run ?? (undefined as unknown)) as QuizRun;
							}
							this.updateState(s => { s.runFetchStarted = true; });

							const studentId: Id = this.user.map(u => u.uid).orElse(toId(""));
							const quizId: Id = this.quiz.orElse(toId(""));

							// structured RUN start
							d.run({ quizId, studentIdHash: anonUserKey(String(studentId), String(quizId)), action: "start" });

							// Build question IDs from quiz metadata. Filter by approved when Question
							// objects are already in the WS cache; if not yet loaded, include the
							// question (safe default — GetForUser is get-or-create, so an existing
							// run is returned unchanged and the questions param is ignored).
							let questionIds: Id[] = (this.state.quiz?.groups ?? [])
								.reduce((acc, g) => [...acc, ...(g.questions ?? [])], [] as Id[])
								.filter(q => {
									const question = this.state.questions.find(qu => qu.uid === q);
									return !question || question.approved;
								});
							if (this.state.quiz.shuffleQuestions) {
								questionIds = shuffle(Math.random)(questionIds);
							}

							let run: QuizRun;
							try {
								// IMPORTANT: quiz-scoped run actor (prefix + quizId), and use GetForUser (get-or-create)
								run = (await this.ask(
									`${actorUris.QuizRunActorPrefix}${quizId}`,
									QuizRunActorMessages.GetForUser({ studentId, questions: questionIds })
								)) as QuizRun;
							} catch (e) {
								// Allow a future retry by clearing the in-flight flag.
								this.updateState(s => { s.runFetchStarted = false; });
								throw e;
							}

							d.run({ quizId, studentIdHash: anonUserKey(String(studentId), String(quizId)), action: "ok" });
							this.updateState(s => {
								// Counter guard. The backend atomic upsert removes the
								// sibling-run race, but a late completion that races with
								// LogAnswer's optimistic counter increment must not regress
								// the visible state.
								const beforeCounter = s.run?.counter ?? null;
								const runUidBefore = s.run?.uid;
								if (!s.run || (run?.counter ?? 0) >= (s.run.counter ?? 0)) {
									s.run = run;
									d.runState({
										source: "GetRun",
										beforeCounter,
										afterCounter: s.run?.counter ?? null,
										runUidBefore,
										runUidAfter: s.run?.uid,
									});
								} else {
									d.runState({
										source: "GetRun",
										beforeCounter,
										afterCounter: beforeCounter,
										runUidBefore,
										blocked: true,
										reason: "stale-counter",
									});
								}
								s.runReady = true;
							});

							// Subscribe & fetch questions exactly once, AFTER run is ready
							if (!this.state.questionsSubscribed) {
								this.updateState(s => { s.questionsSubscribed = true; });
								this.send(`${actorUris.QuestionActorPrefix}${quizId}`, QuestionActorMessages.SubscribeToCollection());
								d.listReq({ quizId, transport: "actor", urlOrMsg: "QuestionActor.GetAll", params: { quizId } });
								this.send(`${actorUris.QuestionActorPrefix}${quizId}`, QuestionActorMessages.GetAll());
							}

							// Replay an answer buffered while run was undefined (no-op unless
							// the answered question is already loaded; the QuestionUpdate
							// handler retries once questions arrive).
							this.flushPendingAnswer();

							return run;
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
							let questions = this.state.quiz.groups
								.reduce((q, group) => [...q, ...group.questions], [] as Id[])
								.filter(q => {
									const question = this.state.questions.find(qu => qu.uid === q);
									return question?.approved;
								});

							// Die Fragen sollten hier in Reihenfolge stehen. Falls wir das mischen müssen, passiert das jetzt.
							if (this.state.quiz.shuffleQuestions) {
								const randomShuffle = shuffle(Math.random);
								questions = randomShuffle(questions);
							}


							const run: QuizRun = await this.ask(
								`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
								QuizRunActorMessages.GetForUser({ studentId, questions })
							);
							this.updateState(draft => {
								const beforeCounter = draft.run?.counter ?? null;
								const runUidBefore = draft.run?.uid;
								// Same guard as GetRun: a delayed StartQuiz completion
								// must not regress an already-advanced optimistic state.
								if (!draft.run || (run?.counter ?? 0) >= (draft.run.counter ?? 0)) {
									draft.run = run;
									draft.result = run;
									d.runState({
										source: "StartQuiz",
										beforeCounter,
										afterCounter: draft.run?.counter ?? null,
										runUidBefore,
										runUidAfter: draft.run?.uid,
									});
								} else {
									d.runState({
										source: "StartQuiz",
										beforeCounter,
										afterCounter: beforeCounter,
										runUidBefore,
										blocked: true,
										reason: "stale-counter",
									});
								}
							});

							// run just (re)initialised — replay a buffered answer if any.
							this.flushPendingAnswer();

							return unit();
						},
						LogAnswer: async ({ questionId, answer }) => {
							if (this.state.run) {
								const cleanedAnswers =
									typeof answer === "string"
										? answer
										: answer.map(a => (a === null ? false : a));

								const answers = [...this.state.run.answers, cleanedAnswers];
								const question = this.state.questions.find(q => q.uid === questionId)!;
								let answerCorrect: boolean | null = null;
								if (question.type === "TEXT") {
									if (answer.length > 0) {
										answerCorrect = true;
									} else {
										answerCorrect = null;
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
										answerCorrect = null;
									}
								}
								const correct = [...this.state.run.correct, answerCorrect !== null && answerCorrect];

								const wrong = [...this.state.run.wrong, answerCorrect !== null && !answerCorrect];

								const nextCounter = this.state.run.counter + 1;

								this.updateState(draft => {
									if (draft.run) {
										const beforeCounter = draft.run.counter;
										draft.run.counter = nextCounter;
										draft.run.answers = answers as QuizRun["answers"];
										draft.run.correct = correct;
										draft.run.wrong = wrong;
										d.runState({
											source: "LogAnswer",
											beforeCounter,
											afterCounter: nextCounter,
											runUidBefore: draft.run.uid,
											runUidAfter: draft.run.uid,
										});
									}
								});

								this.send(
									`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuizRunActorMessages.Update({
										uid: this.state.run.uid,
										answers,
										counter: nextCounter,
										correct,
										wrong,
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
										wrong: answerCorrect !== null && !answerCorrect,
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
										correct: answerCorrect !== null && answerCorrect,
										wrong: answerCorrect !== null && !answerCorrect,
									};
								}
								this.send(
									`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
									StatisticsActorMessages.Update(stat)
								);
							} else {
								// `run` is undefined — the answer was selected during the run
								// (re)initialisation window (e.g. a WS reconnect cleared `run`
								// and the async re-fetch hasn't completed, or a reset was
								// dequeued ahead of this LogAnswer). Buffer it instead of
								// silently dropping; flushPendingAnswer() replays it once the
								// run and question set are ready. Last-write-wins: only one
								// question is answerable at a time, so a single slot suffices.
								this.updateState(draft => {
									draft.pendingAnswer = { questionId, answer };
								});
								d.runState({
									source: "LogAnswer",
									beforeCounter: null,
									afterCounter: null,
									blocked: true,
									reason: "run-undefined-buffered",
								});
							}
							return unit();
						},
						ChangeState: async newState => {
							if (newState === "STARTED") {
								if (["ACTIVE", "EDITING", "STOPPED"].includes(this.state.quiz.state)) {
									// this.send(
									// 	`${actorUris.QuizRunActorPrefix}${this.quiz.orElse(toId("-"))}`,
									// 	QuizRunActorMessages.Clear()
									// );
									// this.send(
									// 	`${actorUris.StatsActorPrefix}${this.quiz.orElse(toId("-"))}`,
									// 	StatisticsActorMessages.Clear()
									// );
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
										actorUris.QuizActor,
										QuizActorMessages.UnstallQuestions({
											quizId: this.state.quiz.uid,
										})
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
								studentsCanSeeStatistics: true,
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
								createdBy: creator,
								shuffleAnswers: false,
							};
							const quizUid: Id = await this.ask(actorUris.QuizActor, QuizActorMessages.Create(quizData));
							this.send(this.ref, CurrentQuizMessages.SetQuiz(quizUid));
							return unit();
						},
						AddComment: async comment => {
							const u = this.user.orUndefined();
							if (!u) return unit();
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
							const u = this.user.orUndefined();
							if (!u) return unit();
							try {
								question.approved = true;
								const uid: Id = await this.ask(
									`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuestionActorMessages.Create({
										authorId: u.uid,
										authorFingerprint: u.fingerprint,
										...question,
									})
								);
								if (uid.toString() === "") {
									console.error("Failed to create new question", question);
									return unit();
								}
								const groups = this.state.quiz.groups;
								const addTo = groups.find(g => g.name === group);
								if (!addTo) {
									// Target group disappeared (e.g. renamed concurrently); delete the orphaned question.
									console.error(`AddQuestion: group "${group}" not found — rolling back created question ${String(uid)}`);
									this.send(
										`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
										QuestionActorMessages.Delete(uid)
									);
									return unit();
								}
								addTo.questions.push(uid);
								addTo.questions = addTo.questions.filter(q => q !== "");
								this.send(this.actorRef!, CurrentQuizMessages.Update({ groups }));
							} catch (e) {
								console.error("AddQuestion failed", e);
								throw e;
							}
							return unit();
						},
						UpdateQuestion: async ({ question, group }) => {
							if (!question.uid) {
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

						setIsPresentationModeActive: async value => {
							this.updateState(draft => {
								draft.isPresentationModeActive = value;
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
								if (!uid) return unit();
								if (uid === this.state.quiz.uid) {
									if (this.state.quiz.state === "STARTED" && this.state.run === undefined) {
										const studentId: Id = this.user.map(u => u.uid).orElse(toId(""));
										const quizId: Id = this.quiz.orElse(toId(""));
										const run = (await this.ask(
											actorUris.QuizActor,
											QuizActorMessages.GetUserRun({ studentId, quizId })
										)) as QuizRun | Error;
										if ((run as Error)?.message !== "No run for user" && keys(run).length > 0) {
											this.updateState(draft => {
												// Counter guard parallels GetRun. Without this, a
												// late-returning GetUserRun whose findOne saw the
												// DB before LogAnswer's Update committed can
												// regress state.run.counter against an optimistic
												// state already populated by a parallel GetRun.
												const incoming = run as QuizRun;
												const beforeCounter = draft.run?.counter ?? null;
												const runUidBefore = draft.run?.uid;
												if (!draft.run || (incoming.counter ?? 0) >= (draft.run.counter ?? 0)) {
													draft.run = incoming;
													d.runState({
														source: "SetQuiz-same",
														beforeCounter,
														afterCounter: draft.run?.counter ?? null,
														runUidBefore,
														runUidAfter: draft.run?.uid,
													});
												} else {
													d.runState({
														source: "SetQuiz-same",
														beforeCounter,
														afterCounter: beforeCounter,
														runUidBefore,
														blocked: true,
														reason: "stale-counter",
													});
												}
											});
										} else {
											this.send(this.ref, CurrentQuizMessages.StartQuiz());
										}
									}
									// Reconnect re-runs SetQuiz for the same quiz and repopulates
									// run here; replay a buffered answer if one is waiting.
									this.flushPendingAnswer();
									return unit();
								}
								this.state = { ...this.state, comments: [], questions: [], deleted: false };
								this.quiz.forEach(q => {
									this.send(actorUris.QuizActor, QuizActorMessages.UnsubscribeFrom(q));
									this.send(
										`${actorUris.CommentActorPrefix}${q}`,
										CommentActorMessages.UnsubscribeFromCollection()
									);
									this.send(
										`${actorUris.QuestionActorPrefix}${q}`,
										QuestionActorMessages.UnsubscribeFromCollection()
									);
									this.send(
										`${actorUris.QuizRunActorPrefix}${q}`,
										QuizRunActorMessages.UnsubscribeFromCollection()
									);
									this.send(
										`${actorUris.StatsActorPrefix}${q}`,
										StatisticsActorMessages.UnsubscribeFromCollection()
									);
								});
								this.quiz = maybe(uid);
								const quizData: Quiz = await this.ask(actorUris.QuizActor, QuizActorMessages.Get(uid));
								this.updateState(draft => {
									d.runState({
										source: "SetQuiz-different",
										beforeCounter: draft.run?.counter ?? null,
										afterCounter: null,
										runUidBefore: draft.run?.uid,
									});
									draft.run = undefined;
									draft.result = undefined;
									draft.questionStats = undefined;
									draft.groupStats = undefined;
									draft.quizStats = undefined;
									draft.quiz = quizData;
									draft.deleted = !quizData || keys(quizData).length === 0;
									draft.pendingAnswer = undefined;
									draft.runFetchStarted = false;
									draft.runReady = false;
									draft.questionsSubscribed = false;
								});

								this.send(this.ref, CurrentQuizMessages.GetTeacherNames(quizData.teachers));
								this.quiz.forEach(q => {
									this.send(actorUris.QuizActor, QuizActorMessages.SubscribeTo(q));
									this.send(
										`${actorUris.CommentActorPrefix}${q}`,
										CommentActorMessages.SubscribeToCollection()
									);
									this.send(
										`${actorUris.QuestionActorPrefix}${q}`,
										QuestionActorMessages.SubscribeToCollection()
									);
									this.send(
										`${actorUris.QuizRunActorPrefix}${q}`,
										QuizRunActorMessages.SubscribeToCollection()
									);
									this.send(
										`${actorUris.StatsActorPrefix}${q}`,
										StatisticsActorMessages.SubscribeToCollection()
									);
									// debuggin: confirms the client actually requested the full question set (and with which quizId).
									d.listReq({
										quizId: q,
										transport: "actor",
										urlOrMsg: "QuestionActor.GetAll",
										params: { quizId: q }
									});
									this.send(`${actorUris.CommentActorPrefix}${q}`, CommentActorMessages.GetAll());
									this.send(`${actorUris.QuestionActorPrefix}${q}`, QuestionActorMessages.GetAll());
								});

								if (quizData.state === "STARTED") {
									this.send(this.ref, CurrentQuizMessages.GetRun());
								} else {
									const studentId: Id = this.user.map(u => u.uid).orElse(toId(""));
									const quizId: Id = this.quiz.orElse(toId(""));

									d.run({ quizId, studentIdHash: anonUserKey(studentId), action: "start" });

									try {
										const run: Error | QuizRun = await this.ask(
											actorUris.QuizActor,
											QuizActorMessages.GetUserRun({ studentId, quizId })
										);

										// Distinguish the “no run” case
										if ((run as Error)?.message === "No run for user") {
											d.run({ quizId, studentIdHash: anonUserKey(studentId), action: "error", error: "no-run" });
										} else {
											d.run({ quizId, studentIdHash: anonUserKey(studentId), action: "ok" });

											if (run && Object.keys(run).length > 0) {
												this.updateState(draft => {
													draft.result = run as QuizRun;
												});
											}
										}
									} catch (e) {
										d.run({
											quizId,
											studentIdHash: anonUserKey(studentId),
											action: "error",
											error: String(e)
										});
									}
								}
								this.send(this.ref, CurrentQuizMessages.ActivateQuizStats());
							} catch {
								// SetQuiz failed; actor state already cleared above
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
							// DistributedActorSystem rejects the ask Promise with a string on
							// timeout; without the try/catch the rejection unwinds out of the
							// handler and the supervisor shuts CurrentQuiz down (see
							// getuserrun-counter-regression investigation). Names are cosmetic;
							// degrade to empty rather than killing the session.
							let names: Array<{ nickname?: string; username: string }> = [];
							try {
								const result = await this.ask(
									actorUris.UserStore,
									UserStoreMessages.GetNames(this.state.quiz.teachers)
								);
								if (Array.isArray(result)) {
									names = result;
								}
							} catch (e) {
								d.runState({
									source: "AskFailure",
									beforeCounter: null,
									afterCounter: null,
									reason: `GetTeacherNames ask failed: ${String(e)}`,
								});
							}
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
							}
							return unit();
						},
						Duplicate: async () => {
							const result = await this.ask(
								actorUris.QuizActor,
								QuizActorMessages.Duplicate(this.quiz.orElse(toId(""))),
								seconds(10).valueOf()
							);
							if (typeof result === "string") {
								alert(i18n._("duplicate-quiz-okay"));
							} else {
								alert(i18n._("duplicate-quiz-error"));
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
	}
}
