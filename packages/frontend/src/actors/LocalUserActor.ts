import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { User, UserStoreMessages, UserUpdateMessage } from "@recapp/models";
import { Unit, unit } from "itu-utils";

export class LocalUserActor extends StatefulActor<UserUpdateMessage, Unit | string, { user: User | undefined }> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { user: undefined };
	}

	public async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", UserStoreMessages.GetOwn());
		if (!this.state && result) {
			this.send("actors://recapp-backend/UserStore", UserStoreMessages.SubscribeTo(result.uid));
		}
		this.updateState(draft => {
			console.log("RESULT", result);
			draft.user = result;
		});
	}

	async receive(_from: ActorRef, message: UserUpdateMessage | string): Promise<Unit | string> {
		console.warn(_from.name, message);
		if (typeof message === "string") {
			if (message === "uid") return this.state.user?.uid ?? "";
		} else if (message.type == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.user = message.user as User;
			});
		}
		return unit();
	}
}
