import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ActorSystem } from "ts-actors";
import { ErrorActor, ErrorMessages } from "../../src/actors/ErrorActor";
import { getActorState } from "./stubs";

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

describe("ErrorActor", () => {
	let system: ActorSystem;
	let ref: Awaited<ReturnType<typeof system.createActor>>;

	beforeEach(async () => {
		vi.useFakeTimers();
		system = await ActorSystem.create({ systemName: "test", logger: silentLogger as any });
		ref = await system.createActor(ErrorActor, { name: "ErrorActor" });
	});

	afterEach(async () => {
		await system.shutdown();
		vi.useRealTimers();
	});

	const state = () => getActorState<{ error: string }>(system, "ErrorActor");

	it("starts with empty error string", () => {
		expect(state().error).toBe("");
	});

	it("SetError with 'deactivated' message sets the deactivated error id", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("user deactivated")));
		expect(state().error).toBe("error-message-user-deactivated");
	});

	it("SetError with 'expired' message sets the session-expired error id", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("session expired")));
		expect(state().error).toBe("error-message-session-expired");
	});

	it("SetError with 'rpc' message sets the no-server-connection error id", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("rpc call failed")));
		expect(state().error).toBe("error-message-no-server-connection");
	});

	it("SetError with 'unknown' keyword sets the unknown error id", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("unknown actor error")));
		expect(state().error).toBe("error-unknown-error-occured");
	});

	it("SetError with unrecognized message returns empty string (no match)", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("something completely different")));
		expect(state().error).toBe("");
	});

	it("SetError is case-insensitive", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("Session EXPIRED now")));
		expect(state().error).toBe("error-message-session-expired");
	});

	it("ResetError clears the error", async () => {
		await system.ask(ref, ErrorMessages.SetError(new Error("rpc error")));
		await system.ask(ref, ErrorMessages.ResetError());
		expect(state().error).toBe("");
	});

	it("LogWarning does not change state", async () => {
		await system.ask(ref, ErrorMessages.LogWarning("watch out"));
		expect(state().error).toBe("");
	});
});
