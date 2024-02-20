import React, { useEffect, useRef, useState } from "react";
import { ActorSystem, DistributedActorSystem } from "ts-actors";
import { WebsocketDistributor } from "ts-actors/lib/src/WebsocketDistributor";
import { v4 } from "uuid";
import { SystemContext } from "./SystemContext";
import { Data } from "./Data";

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
