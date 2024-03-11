import { ActorSystem, ActorRef } from "ts-actors";
import { Try, Maybe, nothing, maybe } from "tsmonads";

export const cookie = (name: string): string => {
	const cookies = new Map(
		document.cookie.split(";").map(c => {
			const [k, v] = c.split("=", 2);
			if (!k) {
				return ["", ""];
			} else {
				return [k.trim(), v.trim()];
			}
		})
	);
	return cookies.get(name) ?? "";
};

export const flattenSystem = <T>(
	tSystem: Try<ActorSystem>,
	tActor: Try<ActorRef>,
	mbState: Maybe<T>
): Maybe<[ActorSystem, ActorRef, T]> => {
	const state = mbState.orUndefined();
	if (!state) return nothing();
	const actor = tActor.toMaybe().orUndefined();
	if (!actor) return nothing();
	return tSystem.toMaybe().flatMap(s => maybe([s, actor, state] as [ActorSystem, ActorRef, T]));
};
