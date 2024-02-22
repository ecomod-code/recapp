import { useState, useEffect, useContext } from "react";
import { ActorRef } from "ts-actors";
import { SystemContext } from "../SystemContext";
import { Try, fromError, fromValue } from "tsmonads";
import { ActorNames } from "../actors/names";

export const useActor = (name: ActorNames): Try<ActorRef> => {
	const maybeSystem = useContext(SystemContext);
	const [result, setResult] = useState<Try<ActorRef>>(fromError(new Error("No actor system in context")));
	useEffect(() => {
		maybeSystem.forEach(system => {
			const actorOrError = system.getActorRef("actors://" + system.systemName + "/" + name) as ActorRef;
			if (actorOrError instanceof Error) {
				setResult(fromError(actorOrError));
			} else {
				setResult(fromValue(actorOrError));
			}
		});
	}, [maybeSystem, name]);
	return result;
};
