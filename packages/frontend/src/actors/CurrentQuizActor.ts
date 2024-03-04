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
} from "@recapp/models";
import { Unit, toTimestamp, unit } from "itu-utils";
import { Maybe, maybe, nothing } from "tsmonads";

export class AddComment {
	public readonly type = "AddComment" as const;
	constructor(public readonly comment: Omit<Comment, "uid" | "authorName" | "authorId">) {}
}

export class FinishComment {
	public readonly type = "FinishComment" as const;
	constructor(public readonly commentId: Id) {}
}

export class UpdvoteComment {
	public readonly type = "UpvoteComment" as const;
	constructor(public readonly commentId: Id) {}
}

export class SetQuiz {
	public readonly type = "SetQuiz" as const;
	constructor(public readonly quizId: Id) {}
}

export class SetUser {
	public readonly type = "SetUser" as const;
	constructor(public readonly user: User) {}
}

type MessageType =
	| QuizUpdateMessage
	| CommentUpdateMessage
	| AddComment
	| FinishComment
	| UpdvoteComment
	| SetUser
	| SetQuiz;

export class CurrentQuizActor extends StatefulActor<MessageType, Unit, { quiz: Quiz; comments: Comment[] }> {
	private quiz: Maybe<Id> = nothing();
	private user: Maybe<User> = nothing();

	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { quiz: {} as Quiz, comments: [] };
	}

	async afterStart(): Promise<void> {
		// If quiz doesn't exist, create it
		try {
			const exists: boolean = await this.ask(
				"actors://recapp-backend/QuizActor",
				QuizActorMessages.Has("demo-quiz" as Id)
			);
			if (!exists) {
				await this.send(
					"actors://recapp-backend/QuizActor",
					QuizActorMessages.Create({
						uid: "demo-quiz" as Id,
						title: "Ein DEMO-Quiz",
						description: "Ein Beispiel",
						state: "ACTIVE",
						groups: [{ name: "DEFAULT", elements: [] }],
						studentQuestions: true,
						studentParticipationSettings: { ANONYMOUS: true, NAME: true, NICKNAME: true },
						allowedQuestionTypesSettings: { MULTIPLE: true, SINGLE: true, TEXT: true },
						studentParticipation: { ANONYMOUS: true, NAME: true, NICKNAME: true },
						allowedQuestionTypes: { MULTIPLE: true, SINGLE: true, TEXT: true },
						shuffleQuestions: false,
						activeComments: true,
						teachers: [toId("hendrik.belitz")],
						students: [],
						created: toTimestamp(),
						updated: toTimestamp(),
					})
				);
			}
		} catch (e) {
			console.error(e);
			throw e;
		}
	}

	async receive(_from: ActorRef, message: MessageType): Promise<any> {
		switch (message.type) {
			case "QuizUpdateMessage": {
				this.updateState(draft => {
					draft.quiz = { ...draft.quiz, ...message.quiz };
				});
				break;
			}
			case "CommentUpdateMessage": {
				this.updateState(draft => {
					draft.comments = draft.comments.filter(u => u.uid != message.comment.uid);
					draft.comments.push(message.comment as Comment);
					draft.comments.sort((a, b) => a.uid.localeCompare(b.uid));
				});
				break;
			}
			case "AddComment": {
				console.log("ADD", this.user, message);
				this.user.forEach(u => {
					this.send(
						"actors://recapp-backend/QuizActor/Comment_demo-quiz",
						CommentActorMessages.Create({
							authorName: u.username,
							authorId: u.uid,
							...message.comment,
						})
					);
				});
				break;
			}
			case "FinishComment": {
				this.send(
					"actors://recapp-backend/QuizActor/Comment_demo-quiz",
					CommentActorMessages.Update({
						uid: message.commentId,
						answered: true,
					})
				);
				break;
			}
			case "UpvoteComment": {
				this.user.forEach(u => {
					this.send(
						"actors://recapp-backend/QuizActor/Comment_demo-quiz",
						CommentActorMessages.Upvote({
							commentId: message.commentId,
							userId: u.uid,
						})
					);
				});
				break;
			}
			case "AddComment": {
				this.user.forEach(u => {
					this.send(
						"actors://recapp-backend/QuizActor/Comment_demo-quiz",
						CommentActorMessages.Create({
							authorName: u.username,
							authorId: u.uid,
							...message.comment,
						})
					);
				});
				break;
			}
			case "SetUser": {
				this.user = maybe(message.user);
				this.quiz.forEach(q => {
					this.send(this.actorRef!, new SetQuiz(q));
				});
				break;
			}
			case "SetQuiz": {
				try {
					this.quiz.forEach(q => {
						this.send("actors://recapp-backend/QuizActor", QuizActorMessages.UnsubscribeFrom(q));
					});
					this.quiz.forEach(q => {
						this.send(
							"actors://recapp-backend/QuizActor/Comment_demo-quiz",
							CommentActorMessages.UnsubscribeFromCollection()
						);
					});
					this.quiz = maybe(message.quizId);
					const quizData: Quiz = await this.ask(
						"actors://recapp-backend/QuizActor",
						QuizActorMessages.Get(message.quizId)
					);
					await this.send(
						"actors://recapp-backend/QuizActor/Comment_demo-quiz",
						CommentActorMessages.GetAll()
					);
					this.updateState(draft => {
						draft.quiz = quizData;
					});
					this.send("actors://recapp-backend/QuizActor", QuizActorMessages.SubscribeTo(message.quizId));
					this.send(
						"actors://recapp-backend/QuizActor/Comment_demo-quiz",
						CommentActorMessages.SubscribeToCollection()
					);
				} catch (e) {
					console.error(e);
				}
				console.log("SETQUIZ", this.state);
				break;
			}
		}
		return unit();
	}
}
