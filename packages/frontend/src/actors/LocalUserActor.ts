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
} from "@recapp/models";
import { Unit, unit } from "itu-utils";
import { actorUris } from "../actorUris";

export class LocalUserActor extends StatefulActor<
	UserUpdateMessage | QuizUpdateMessage | string,
	Unit | string,
	{ user: User | undefined; quizzes: Map<Id, Partial<Quiz>> }
> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { user: undefined, quizzes: new Map() };
	}

	public async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", UserStoreMessages.GetOwn());
		if (!this.state.user && result) {
			this.send(actorUris.UserStore, UserStoreMessages.SubscribeTo(result.uid));
			this.send(actorUris.QuizActor, QuizActorMessages.GetAll());
			this.send(
				actorUris.QuizActor,
				QuizActorMessages.SubscribeToCollection(["uid", "title", "state", "students", "groups"])
			);
		}
		this.updateState(draft => {
			draft.user = result;
		});
	}

	async receive(_from: ActorRef, message: UserUpdateMessage | QuizUpdateMessage | string): Promise<Unit | string> {
		console.warn("LOCALUSER", _from.name, message);
		if (typeof message === "string") {
			if (message === "uid") return this.state.user?.uid ?? "";
		} else if (message.tag == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.user = message.user as User;
			});
		} else if (message.tag == "QuizUpdateMessage") {
			this.updateState(draft => {
				if (message.quiz.uid) {
					draft.quizzes.set(message.quiz.uid, message.quiz);
				}
			});
		}
		return unit();
	}
}
