import { curry } from "rambda";
import { ActorSystem, ActorRef } from "ts-actors";
import { Try, Maybe, nothing, maybe } from "tsmonads";
import { Question } from "@recapp/models";

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

export const shuffle = curry(<T>(random: () => number, list: T[]) => {
	let idx = -1;
	const len = list.length;
	let position;
	const result: Array<T> = [];
	while (++idx < len) {
		position = Math.floor((idx + 1) * random());
		result[idx] = result[position];
		result[position] = list[idx];
	}
	return result;
});

export const isMultiChoiceAnsweredCorrectly = (answers: boolean[], question: Question | undefined) => {
    const isAnsweredCorrectly = answers.map((a, i) => !!a === question?.answers[i].correct).every(Boolean);

    return isAnsweredCorrectly;
};