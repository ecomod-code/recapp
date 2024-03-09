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
		AddQuestion: ofType<Omit<Question, "uid" | "authorName" | "authorId">>(),
		UpdateQuestion: ofType<Partial<Question> & { uid: Id }>(),
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
						activeComments: true,
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
				AddQuestion: async question => {
					this.user.forEach(u => {
						this.send(
							`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
							QuestionActorMessages.Create({
								authorName: u.username,
								authorId: u.uid,
								...question,
							})
						);
					});
				},
				UpdateQuestion: async question => {
					this.send(
						`${actorUris.QuestionActorPrefix}${this.quiz.orElse(toId("-"))}`,
						QuestionActorMessages.Update(question)
					);
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
						});
						this.quiz = maybe(uid);
						const quizData: Quiz = await this.ask(actorUris.QuizActor, QuizActorMessages.Get(uid));
						await this.send(
							`${actorUris.CommentActorPrefix}${this.quiz.orElse(toId("-"))}`,
							CommentActorMessages.GetAll()
						);
						this.updateState(draft => {
							draft.quiz = quizData;
						});
						this.send(actorUris.QuizActor, QuizActorMessages.SubscribeTo(uid));
						this.send(
							`${actorUris.CommentActorPrefix}${this.quiz}`,
							CommentActorMessages.SubscribeToCollection()
						);
					} catch (e) {
						console.error(e);
					}
				},
			})
		);

		return unit();
	}
}
