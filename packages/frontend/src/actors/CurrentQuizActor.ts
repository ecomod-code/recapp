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
	QuestionGroup,
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
		UpvoteComment: ofType<Id>(),
		FinishComment: ofType<Id>(),
		AddComment: ofType<Omit<Comment, "uid" | "authorName" | "authorId">>(),
		AddQuestion: ofType<{
			question: Omit<Question, "uid" | "authorName" | "authorId" | "created" | "updated">;
			group: string;
		}>(),
		Update: ofType<Partial<Quiz>>(),
		UpdateQuestion: ofType<{ question: Partial<Question> & { uid: Id }; group: string }>(),
	},
	{ value: "value" }
);

export type CurrentQuizMessage = UnionOf<typeof CurrentQuizMessages>;

type MessageType = QuizUpdateMessage | CommentUpdateMessage | QuestionUpdateMessage | CurrentQuizMessage;

export class CurrentQuizActor extends StatefulActor<
	MessageType,
	Unit,
	{ quiz: Quiz; comments: Comment[]; questions: Question[] }
> {
	private quiz: Maybe<Id> = nothing();
	private user: Maybe<User> = nothing();

	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { quiz: {} as Quiz, comments: [], questions: [] };
	}

	private async handleRemoteUpdates(message: MessageType): Promise<Maybe<CurrentQuizMessage>> {
		console.log("CURRENTQUIZ", message);
		if (message.tag === "QuizUpdateMessage") {
			this.updateState(draft => {
				draft.quiz = { ...draft.quiz, ...message.quiz };
			});
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
		}
		return maybe(message);
	}

	async receive(_from: ActorRef, message: MessageType): Promise<Unit> {
		const maybeLocalMessage = await this.handleRemoteUpdates(message);

		// Deal with local messages
		maybeLocalMessage.forEach(m =>
			CurrentQuizMessages.match(m, {
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
					};
					const quizUid: Id = await this.ask(actorUris.QuizActor, QuizActorMessages.Create(quizData));
					this.send(this.ref, CurrentQuizMessages.SetQuiz(quizUid));
				},
				AddComment: async comment => {
					this.user.forEach(u => {
						this.send(
							`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
							CommentActorMessages.Create({
								authorName: u.username,
								authorId: u.uid,
								...comment,
							})
						);
					});
				},
				AddQuestion: async ({ question, group }) => {
					try {
						await this.user.map(async u => {
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
				},
				UpdateQuestion: async ({ question, group }) => {
					await this.send(
						`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
						QuestionActorMessages.Update(question)
					);
					if (!group) {
						return;
					}
					const groups = this.state.quiz.groups.map(g => {
						if (g.questions.includes(question.uid)) {
							g.questions = g.questions.filter(q => q !== question.uid);
						}
						return g;
					});
					const addTo = groups.find(g => g.name === group);
					addTo?.questions.push(question.uid);
					if (!addTo) {
						alert(groups.map(g => g.name).join(";") + " does not contain " + group);
					}
					this.send(this.actorRef!, CurrentQuizMessages.Update({ groups }));
				},
				FinishComment: async uid => {
					this.send(
						`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
						CommentActorMessages.Update({
							uid,
							answered: true,
						})
					);
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
				},
				SetUser: async user => {
					this.user = maybe(user);
					this.quiz.forEach(q => {
						this.send(this.actorRef!, CurrentQuizMessages.SetQuiz(q));
					});
				},
				SetQuiz: async uid => {
					try {
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
				},
				Update: async quiz => {
					this.send(actorUris.QuizActor, QuizActorMessages.Update({ uid: this.state.quiz.uid, ...quiz }));
				},
			})
		);

		return unit();
	}
}
