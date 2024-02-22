import { useState, useEffect, useContext } from "react";
import { ActorRef } from "ts-actors";
import { SystemContext } from "../SystemContext";
import { Try, fromError, fromValue } from "tsmonads";
import { ActorNames } from "../actors/names";

export const useStatefulActor = <T>(name: ActorNames, def: T): [Try<ActorRef>, T] => {
	const [state, setState] = useState<T>(def);
	const maybeSystem = useContext(SystemContext);
	const [result, setResult] = useState<Try<ActorRef>>(fromError(new Error("No actor system in context")));
	useEffect(() => {
		maybeSystem.forEach(system => {
			const actorOrError = system.getActorRef("actors://" + system.systemName + "/" + name) as ActorRef;
			if (actorOrError instanceof Error) {
				setResult(fromError(actorOrError));
			} else {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(actorOrError as any).actor.stateChanged = (x: T) => setState(x);
				setResult(fromValue(actorOrError));
			}
		});
	}, [maybeSystem, name]);
	return [result, state];
};
