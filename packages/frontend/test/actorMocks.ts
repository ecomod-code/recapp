/**
 * Factory helpers for mocking useStatefulActor() return values in component tests.
 *
 * useStatefulActor<T>() returns [Maybe<T>, Try<ActorRef>].
 * Both are tsmonad types — they must be real instances, not plain objects,
 * because components call .map(), .forEach(), .orElse() on them.
 */
import { vi } from "vitest";
import { maybe, nothing, Success } from "tsmonads";
import type { ActorRef } from "ts-actors";
import type { Maybe } from "tsmonads";

export type MockActorRef = Pick<ActorRef, "name" | "isShutdown"> & { send: ReturnType<typeof vi.fn> };

export function makeMockActorRef(): MockActorRef {
	return { name: "mock-actor", isShutdown: false, send: vi.fn() };
}

/** Return value when actor state is available */
export function withState<T>(state: T, actorRef?: MockActorRef): [Maybe<T>, Success<MockActorRef>] {
	const ref = actorRef ?? makeMockActorRef();
	return [maybe(state) as Maybe<T>, new Success(ref)];
}

/** Return value when actor is not yet ready (nothing state) */
export function withNoState<T>(): [ReturnType<typeof nothing>, ReturnType<typeof nothing>] {
	return [nothing(), nothing()];
}
