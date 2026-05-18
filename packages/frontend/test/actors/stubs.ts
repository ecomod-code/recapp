import { Actor } from "ts-actors";
import type { ActorRef, ActorSystem } from "ts-actors";
import { toActorUri } from "@recapp/models";

/**
 * A generic stub actor that delegates receive() to a provided handler.
 * Use with system.createActor(StubActor, { name: "..." }, handlerFn).
 */
export class StubActor extends Actor<unknown, unknown> {
	constructor(
		name: string,
		system: ActorSystem,
		public readonly handler: (msg: unknown) => unknown = () => undefined
	) {
		super(name, system);
	}

	async receive(_from: ActorRef, message: unknown): Promise<unknown> {
		return this.handler(message);
	}
}

/**
 * Register a stub actor in the system and return its URI string.
 * The URI is actors://<systemName>/<name>.
 */
export async function createStub(
	system: ActorSystem,
	name: string,
	handler: (msg: unknown) => unknown = () => undefined
): Promise<string> {
	await system.createActor(StubActor, { name }, handler);
	return toActorUri(`actors://${(system as any).systemName}/${name}`);
}

/**
 * Read the protected `state` from a StatefulActor via the ActorSystem.
 */
export function getActorState<T>(system: ActorSystem, actorName: string): T {
	const ref = system.getActorRef(`actors://${(system as any).systemName}/${actorName}`) as any;
	if (ref instanceof Error) throw ref;
	return ref.actor.state as T;
}
