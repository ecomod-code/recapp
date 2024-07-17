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

export class DeleteQuizMessage {
	public readonly tag = "DeleteQuizMessage" as const;
	constructor(public readonly id: Id) {}
}

export class UploadQuizMessage {
	public readonly tag = "UploadQuizMessage" as const;
	constructor(public readonly filename: string) {}
}

export class ToggleShowArchived {
	public readonly tag = "ToggleShowArchived" as const;
	constructor(public readonly value: boolean) {}
}

export class ResetError {
	public readonly tag = "ResetError" as const;
	constructor() {}
}

type Messages =
	| UserUpdateMessage
	| QuizUpdateMessage
	| ArchiveQuizMessage
	| UploadQuizMessage
	| string
	| ToggleShowArchived
	| ResetError
	| DeleteQuizMessage;

type State = {
	user: User | undefined;
	quizzes: Map<Id, Partial<Quiz>>;
	teachers: Map<Id, string[]>;
	updateCounter: number;
	showArchived: boolean;
	error: string;
};

export class LocalUserActor extends StatefulActor<Messages, Unit | string, State> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = {
			user: undefined,
			quizzes: new Map(),
			teachers: new Map(),
			updateCounter: 0,
			showArchived: false,
			error: "",
		};
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
					"uniqueLink",
					"createdBy",
				])
			);
		}
		this.updateState(draft => {
			draft.user = result;
			draft.updateCounter++;
		});
	}

	async receive(_from: ActorRef, message: Messages): Promise<Unit | string> {
		if (typeof message === "string") {
			if (message === "uid") return this.state.user?.uid ?? "";
		} else if (message.tag == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.user = message.user as User;
				draft.updateCounter++;
			});
		} else if (message.tag == "QuizUpdateMessage") {
			const names: any[] = message.quiz.teachers
				? await this.ask(actorUris.UserStore, UserStoreMessages.GetNames(message.quiz.teachers))
				: [];
			this.updateState(draft => {
				if (message.quiz.uid) {
					const isTeacher = message.quiz.teachers?.includes(this.state.user?.uid ?? toId(""));
					const isStudent = message.quiz.students?.includes(this.state.user?.uid ?? toId(""));
					if (this.state.user?.role === "ADMIN" || isTeacher || isStudent) {
						draft.quizzes.set(message.quiz.uid, message.quiz);
						draft.teachers.set(
							message.quiz.uid,
							names.map(n => n.username)
						);
					}
					draft.updateCounter++;
				}
			});
		} else if (message.tag == "ArchiveQuizMessage") {
			this.send(
				actorUris["QuizActor"],
				QuizActorMessages.Update({ uid: message.id, state: "STOPPED", archived: toTimestamp() })
			);
		} else if (message.tag == "DeleteQuizMessage") {
			this.send(actorUris["QuizActor"], QuizActorMessages.Delete(message.id));
			this.updateState(draft => {
				draft.quizzes.delete(message.id);
				draft.teachers.delete(message.id);
				draft.updateCounter++;
			});
		} else if (message.tag == "UploadQuizMessage") {
			const result: Error | Unit = await this.ask(
				actorUris["QuizActor"],
				QuizActorMessages.Import({ filename: message.filename })
			);
			if ((result as any).message) {
				this.updateState(draft => {
					draft.error = (result as any).message;
				});
			} else {
				this.updateState(draft => {
					draft.error = "";
				});
			}
		} else if (message.tag == "ToggleShowArchived") {
			this.updateState(draft => {
				draft.showArchived = message.value;
				draft.updateCounter++;
			});
		} else if (message.tag == "ResetError") {
			this.updateState(draft => {
				draft.error = "";
			});
		}
		return unit();
	}
}
