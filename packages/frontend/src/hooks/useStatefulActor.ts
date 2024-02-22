import { useState, useEffect, useContext } from "react";
import { ActorRef } from "ts-actors";
import { SystemContext } from "../SystemContext";
import { Maybe, Try, fromError, fromValue, maybe } from "tsmonads";
import { ActorNames } from "../actors/names";
import { v4 } from "uuid";

export const useStatefulActor = <T>(
	name: ActorNames,
	from: string,
	def: T | undefined = undefined
): [Maybe<T>, Try<ActorRef>] => {
	const [state, setState] = useState<T | undefined>(def);
	const maybeSystem = useContext(SystemContext);
	const [result, setResult] = useState<Try<ActorRef>>(fromError(new Error("No actor system in context")));
	const id = useState(v4());
	console.log("HOOK", id, from);
	useEffect(() => {
		maybeSystem.forEach(system => {
			const actorOrError = system.getActorRef("actors://" + system.systemName + "/" + name) as ActorRef;
			if (actorOrError instanceof Error) {
				setResult(fromError(actorOrError));
			} else {
				const callback = (x: T) => setState(x);
				console.log("ADD", id, from);
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(actorOrError as any).actor.stateChanged.set(id, callback);
				setResult(fromValue(actorOrError));
				if ((actorOrError as any).actor.state) {
					setState((actorOrError as any).actor.state);
				}
				return () => {
					console.log("DEL", id, from);
					(actorOrError as any).actor.stateChanged.delete(id);
				};
			}
		});
	}, [maybeSystem, name]);
	return [maybe(state), result];
};
