import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { Fingerprint, FingerprintStoreMessages, FingerprintUpdateMessage, User, UserStoreMessages, UserUpdateMessage } from "@recapp/models";

export class UserAdminActor extends StatefulActor<UserUpdateMessage | FingerprintUpdateMessage, true, { users: User[], fingerprints: Fingerprint[] }> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { users: [], fingerprints: [] };
	}

	override send<S>(to: string | ActorRef, message: S): void {
		console.log("SENDING", message);
		super.send(to, message);
	}

	async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", UserStoreMessages.GetAll());
		if (this.state.users.length === 0 && result) {
			this.send(
				"actors://recapp-backend/UserStore",
				UserStoreMessages.SubscribeToCollection(["uid", "username", "role", "active", "lastlogin", "nickname"])
			);
		}
		const fpResult: User = await this.ask("actors://recapp-backend/FingerprintStore", FingerprintStoreMessages.GetMostRecent());
		if (this.state.fingerprints.length === 0 && fpResult) {
			this.send(
				"actors://recapp-backend/FingerprintStore",
				FingerprintStoreMessages.SubscribeToCollection()
			);
		}
	}

	async receive(_from: ActorRef, message: UserUpdateMessage | FingerprintUpdateMessage): Promise<true> {
		console.log("USERADMIN", _from.name, message);
		if (message.tag == "UserUpdateMessage") {
			if (message.user.isTemporary) {
				return true;
			}
			this.updateState(draft => {
				draft.users = draft.users.filter(u => u.uid != message.user.uid);
				draft.users.push(message.user as User);
				draft.users.sort((a, b) => a.uid.localeCompare(b.uid));
			});
		}
		if (message.tag == "FingerprintUpdateMessage") {
			this.updateState(draft => {
				draft.fingerprints = draft.fingerprints.filter(u => u.uid != message.fp.uid);
				draft.fingerprints.push(message.fp as Fingerprint);
				draft.fingerprints.sort((a, b) => a.lastSeen.value - b.lastSeen.value);
			});
		}
		return true;
	}
}
