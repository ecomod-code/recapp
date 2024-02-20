import React, { useEffect, useRef, useState } from "react";
import { ActorRef, ActorSystem, DistributedActorSystem } from "ts-actors";
import { WebsocketDistributor } from "ts-actors/lib/src/WebsocketDistributor";
import { v4 } from "uuid";
import { SystemContext } from "./SystemContext";
import { Data } from "./Data";
import { StatefulActor } from "./actors/StatefulActor";
import { User } from "@recapp/models";

class LocalUserActor extends StatefulActor<any, any, { user: User | undefined }> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { user: undefined };
	}

	async afterStart(): Promise<void> {
		const result: User = await this.ask("actors://recapp-backend/UserStore", { UserStoreMessage: "GetOwnUser" });
		if (!this.state.user && result) {
			this.send("actors://recapp-backend/UserStore", { UserStoreMessage: "SubscribeToUser", value: result.uid });
			this.send("actors://recapp-backend/UserStore", {
				UserStoreMessage: "UpdateUser",
				value: { uid: result.uid, username: "Foo3 bar4" },
			});
		}
		this.updateState(draft => {
			draft.user = result;
		});
	}

	async receive(from: ActorRef, message: any): Promise<any> {
		console.log(from.name, message);
		if (message.type == "UserUpdateMessage") {
			this.updateState(draft => {
				draft.user = message.user;
			});
		}
		return true;
	}
}

export const Dashboard: React.FC = () => {
	const [system, setSystem] = useState<ActorSystem>();
	const r = useRef<boolean>();
	useEffect(() => {
		let ignore = false;
		if (!ignore) {
			const systemId = v4();
			const distributor = new WebsocketDistributor(
				systemId,
				`ws://127.0.0.1:3123/ws?clientActorSystem=${systemId}`,
				document.cookie.split(";")[0].split("=")[1]
			);
			DistributedActorSystem.create({ distributor, systemName: systemId }).then(system => {
				setSystem(system);
				system.createActor(LocalUserActor, { name: "LocalUser" });
			});
		}
		return () => {
			if (ignore) system?.shutdown();
			ignore = true;
		};
	}, []);
	return (
		<React.StrictMode>
			<div>
				<a href="http://localhost:3123/auth/logout">Logout</a>
			</div>
			<SystemContext.Provider value={system}>
				<Data />
			</SystemContext.Provider>
		</React.StrictMode>
	);
};
