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
} from "@recapp/models";
import { Unit, toTimestamp, unit } from "itu-utils";
import { Maybe, maybe, nothing } from "tsmonads";
import { i18n } from "@lingui/core";
import { actorUris } from "../actorUris";
import unionize, { UnionOf, ofType } from "unionize";

export const CurrentQuizMessages = unionize(
	{
		CreateQuiz: ofType<Id>(),
		SetUser: ofType<User>(),
		SetQuiz: ofType<Id>(),
		Activate: ofType<{ userId: Id; quizId: Id }>(),
		UpvoteComment: ofType<Id>(),
		FinishComment: ofType<Id>(),
		AddComment: ofType<Omit<Comment, "uid" | "authorName" | "authorId">>(),
		AddQuestion: ofType<{
			question: Omit<Question, "uid" | "authorName" | "authorId" | "created" | "updated">;
			group: string;
		}>(),
		DeleteQuestion: ofType<Id>(),
		DeleteComment: ofType<Id>(),
		GetTeacherNames: {},
		Update: ofType<Partial<Quiz>>(),
		UpdateQuestion: ofType<{ question: Partial<Question> & { uid: Id }; group: string }>(),
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
	| CommentDeletedMessage;

export type CurrentQuizState = { quiz: Quiz; comments: Comment[]; questions: Question[]; teacherNames: string[] };

export class CurrentQuizActor extends StatefulActor<MessageType, Unit, CurrentQuizState> {
	private quiz: Maybe<Id> = nothing();
	private user: Maybe<User> = nothing();

	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { quiz: {} as Quiz, comments: [], questions: [], teacherNames: [] };
	}

	private async handleRemoteUpdates(message: MessageType): Promise<Maybe<CurrentQuizMessage>> {
		console.log("CURRENTQUIZ MESSAGE", message);
		if (message.tag === "QuizUpdateMessage") {
			this.updateState(draft => {
				draft.quiz = { ...draft.quiz, ...message.quiz };
			});
			if (message.quiz.teachers) {
				this.send(this.ref, CurrentQuizMessages.GetTeacherNames(message.quiz.teachers));
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
		}
		return maybe(message);
	}

	async receive(_from: ActorRef, message: MessageType): Promise<Unit> {
		const maybeLocalMessage = await this.handleRemoteUpdates(message);

		// Deal with local messages
		return maybeLocalMessage
			.map(m =>
				CurrentQuizMessages.match<Promise<Unit>>(m, {
					Activate: async ({ userId, quizId }) => {
						const quiz: Quiz = await this.ask(actorUris.QuizActor, QuizActorMessages.Get(quizId));
						const students = quiz.students;
						if (!quiz.teachers.includes(userId)) {
							students.push(userId);
							this.send(this.ref, CurrentQuizMessages.Update({ uid: quizId, students }));
						}
						return unit();
					},
					CreateQuiz: async creator => {
						const quizData: Omit<Quiz, "uid" | "uniqueLink"> = {
							title: i18n._("new-quiz-title"),
							description: i18n._("new-quiz-description"),
							state: "ACTIVE",
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
									authorName: u.username,
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
								const uid: Id = await this.ask(
									`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
									QuestionActorMessages.Create({
										authorName: u.username,
										authorId: u.uid,
										...question,
									})
								);
								const groups = this.state.quiz.groups;
								const addTo = groups.find(g => g.name === group);
								addTo?.questions.push(uid);
								this.send(this.actorRef!, CurrentQuizMessages.Update({ groups }));
							});
						} catch (e) {
							alert(e);
							throw e;
						}
						return unit();
					},
					UpdateQuestion: async ({ question, group }) => {
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
					FinishComment: async uid => {
						this.send(
							`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
							CommentActorMessages.Update({
								uid,
								answered: true,
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
						} catch (e) {
							console.error(e);
						}
						return unit();
					},
					Update: async quiz => {
						this.send(actorUris.QuizActor, QuizActorMessages.Update({ uid: this.state.quiz.uid, ...quiz }));
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
				})
			)
			.orElse(Promise.resolve(unit()));
	}
}
