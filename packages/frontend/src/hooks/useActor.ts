import { useState, useEffect, useContext } from "react";
import { ActorRef } from "ts-actors";
import { SystemContext } from "../SystemContext";
import { fromError, fromValue, Try } from "tsmonads";

export const useActor = (name: string): Try<ActorRef> => {
	const system = useContext(SystemContext);
	const [result, setResult] = useState<Try<ActorRef>>(fromError(new Error("No actor system in context")));
	useEffect(() => {
		if (!system) {
			return;
		}
		const actorOrError = system.getActorRef(`actors://${system.systemName}/${name}`) as ActorRef;
		if (actorOrError instanceof Error) {
			setResult(fromError(actorOrError));
		} else {
			setResult(fromValue(actorOrError));
		}
	}, [system, name]);
	return result;
};
