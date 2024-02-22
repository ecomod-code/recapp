import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "./StatefulActor";
import { User, UserStoreMessages, UserUpdateMessage } from "@recapp/models";

export class LocalUserActor extends StatefulActor<any, any, { user: User | undefined }> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { user: undefined };
	}

	async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", { UserStoreMessage: "GetOwnUser" });
		if (!this.state.user && result) {
			this.send("actors://recapp-backend/UserStore", UserStoreMessages.SubscribeToUser(result.uid));
			this.send(
				"actors://recapp-backend/UserStore",
				UserStoreMessages.UpdateUser({ uid: result.uid, username: "Foo3 bar4" })
			);
		}
		this.updateState(draft => {
			draft.user = result;
		});
	}

	async receive(from: ActorRef, message: UserUpdateMessage): Promise<any> {
		console.log("MSG", from, message);
		if (message.type == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.user = message.user as User;
			});
		}
		return true;
	}
}
