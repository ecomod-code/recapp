import { useState, useEffect, useContext } from "react";
import { ActorRef } from "ts-actors";
import { SystemContext } from "../SystemContext";
import { Try, fromError, fromValue } from "tsmonads";

export const useStatefulActor = <T>(name: string, def: T): [Try<ActorRef>, T] => {
	const [state, setState] = useState<T>(def);
	const system = useContext(SystemContext);
	const [result, setResult] = useState<Try<ActorRef>>(fromError(new Error("No actor system in context")));
	useEffect(() => {
		if (!system) {
			return;
		}
		const actorOrError = system.getActorRef("actors://" + system.systemName + "/" + name) as ActorRef;
		if (actorOrError instanceof Error) {
			setResult(fromError(actorOrError));
		} else {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(actorOrError as any).actor.stateChanged = (x: T) => setState(x);
			setResult(fromValue(actorOrError));
		}
	}, [system, name]);
	return [result, state];
};
