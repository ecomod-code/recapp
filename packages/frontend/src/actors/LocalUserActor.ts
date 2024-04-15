import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import {
	Id,
	Quiz,
	QuizActorMessages,
	QuizUpdateMessage,
	User,
	UserStoreMessages,
	UserUpdateMessage,
	toId,
} from "@recapp/models";
import { Unit, toTimestamp, unit } from "itu-utils";
import { actorUris } from "../actorUris";

export class ArchiveQuizMessage {
	public readonly tag = "ArchiveQuizMessage" as const;
	constructor(public readonly id: Id) {}
}

export class UploadQuizMessage {
	public readonly tag = "UploadQuizMessage" as const;
	constructor(public readonly filename: string) {}
}

export class LocalUserActor extends StatefulActor<
	UserUpdateMessage | QuizUpdateMessage | ArchiveQuizMessage | UploadQuizMessage | string,
	Unit | string,
	{ user: User | undefined; quizzes: Map<Id, Partial<Quiz>>; updateCounter: number }
> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { user: undefined, quizzes: new Map(), updateCounter: 0 };
	}

	public async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", UserStoreMessages.GetOwn());
		if (!this.state.user && result) {
			this.send(actorUris.UserStore, UserStoreMessages.SubscribeTo(result.uid));
			this.send(actorUris.QuizActor, QuizActorMessages.GetAll());
			this.send(
				actorUris.QuizActor,
				QuizActorMessages.SubscribeToCollection([
					"uid",
					"title",
					"state",
					"students",
					"teachers",
					"groups",
					"updated",
					"archived",
				])
			);
		}
		this.updateState(draft => {
			draft.user = result;
			draft.updateCounter++;
		});
	}

	async receive(
		_from: ActorRef,
		message: UserUpdateMessage | QuizUpdateMessage | string | ArchiveQuizMessage | UploadQuizMessage
	): Promise<Unit | string> {
		if (typeof message === "string") {
			if (message === "uid") return this.state.user?.uid ?? "";
		} else if (message.tag == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.user = message.user as User;
				draft.updateCounter++;
			});
		} else if (message.tag == "QuizUpdateMessage") {
			this.updateState(draft => {
				if (message.quiz.uid) {
					if (message.quiz.archived) {
						draft.quizzes.delete(message.quiz.uid);
					} else {
						const isTeacher = message.quiz.teachers?.includes(this.state.user?.uid ?? toId(""));
						const isStudent = message.quiz.students?.includes(this.state.user?.uid ?? toId(""));
						if (this.state.user?.role === "ADMIN" || isTeacher || isStudent) {
							draft.quizzes.set(message.quiz.uid, message.quiz);
						}
					}
					draft.updateCounter++;
				}
			});
		} else if (message.tag == "ArchiveQuizMessage") {
			this.send(actorUris["QuizActor"], QuizActorMessages.Update({ uid: message.id, archived: toTimestamp() }));
		} else if (message.tag == "UploadQuizMessage") {
			this.send(actorUris["QuizActor"], QuizActorMessages.Import({ filename: message.filename }));
		}
		return unit();
	}
}
