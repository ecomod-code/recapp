import { useEffect, useState } from "react";
import { ActorSystem, DistributedActorSystem } from "ts-actors";
import { WebsocketDistributor } from "ts-actors/lib/src/WebsocketDistributor";
import { LocalUserActor } from "../actors/LocalUserActor";
import { Maybe, maybe } from "tsmonads";
import { v4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { UserAdminActor } from "../actors/UserAdminActor";

export const useSystemInit = (): Maybe<ActorSystem> => {
	const navigate = useNavigate();

	const [system, setSystem] = useState<ActorSystem>();

	useEffect(() => {
		if (!document.cookie.includes("bearer")) {
			navigate("/login", { replace: true });
		}
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
				system.createActor(UserAdminActor, { name: "UserAdmin" });
			});
		}
		return () => {
			if (ignore) system?.shutdown();
			ignore = true;
		};
	}, []);

	return maybe(system);
};
