import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { User, UserStoreMessages, UserUpdateMessage } from "@recapp/models";

export class UserAdminActor extends StatefulActor<any, any, { users: User[] }> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { users: [] };
	}

	async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", UserStoreMessages.GetUsers());
		if (!this.state.users && result) {
			this.send(
				"actors://recapp-backend/UserStore",
				UserStoreMessages.SubscribeToUserCollection(["uid", "username", "role", "active"])
			);
		}
	}

	async receive(from: ActorRef, message: UserUpdateMessage): Promise<any> {
		if (message.type == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.users = draft.users.filter(u => u.uid != message.user.uid);
				draft.users.push(message.user as User);
			});
		}
		return true;
	}
}
