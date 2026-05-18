import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ActorSystem } from "ts-actors";

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };
import { SharingActor, SharingMessages, SharingState } from "../../src/actors/SharingActor";
import { actorUris } from "../../src/actorUris";
import { toActorUri, toId } from "@recapp/models";
import { createStub, getActorState } from "./stubs";

describe("SharingActor — synchronous operations", () => {
	let system: ActorSystem;
	let ref: Awaited<ReturnType<typeof system.createActor>>;

	beforeEach(async () => {
		system = await ActorSystem.create({ systemName: "test", logger: silentLogger as any });
		ref = await system.createActor(SharingActor, { name: "QuizSharing" });
	});

	afterEach(async () => {
		await system.shutdown();
	});

	const state = () => getActorState<SharingState>(system, "QuizSharing");

	it("starts with empty teachers and errors", () => {
		expect(state().teachers).toEqual([]);
		expect(state().errors).toEqual([]);
	});

	it("AddExisting replaces teacher list", async () => {
		await system.ask(ref, SharingMessages.AddExisting([
			{ uid: toId("u1"), name: "Alice" },
			{ uid: toId("u2"), name: "Bob" },
		]));
		expect(state().teachers).toHaveLength(2);
		expect(state().teachers[0]).toMatchObject({ uid: "u1", name: "Alice" });
	});

	it("AddExisting replaces (not appends) on second call", async () => {
		await system.ask(ref, SharingMessages.AddExisting([{ uid: toId("u1"), name: "Alice" }]));
		await system.ask(ref, SharingMessages.AddExisting([{ uid: toId("u2"), name: "Bob" }]));
		expect(state().teachers).toHaveLength(1);
		expect(state().teachers[0].uid).toBe("u2");
	});

	it("DeleteEntry removes a teacher by uid", async () => {
		await system.ask(ref, SharingMessages.AddExisting([
			{ uid: toId("u1"), name: "Alice" },
			{ uid: toId("u2"), name: "Bob" },
		]));
		await system.ask(ref, SharingMessages.DeleteEntry(toId("u1")));
		expect(state().teachers).toHaveLength(1);
		expect(state().teachers[0].uid).toBe("u2");
	});

	it("DeleteEntry is a no-op for unknown uid", async () => {
		await system.ask(ref, SharingMessages.AddExisting([{ uid: toId("u1"), name: "Alice" }]));
		await system.ask(ref, SharingMessages.DeleteEntry(toId("unknown")));
		expect(state().teachers).toHaveLength(1);
	});

	it("DeleteError removes an error by id", async () => {
		// Seed an error directly by exploiting the fact that errors get pushed on 'not found'
		// We'll use a stub for UserStore to trigger it in the async test suite instead.
		// Here just confirm the list is initially empty.
		expect(state().errors).toHaveLength(0);
	});

	it("Clear keeps teachers with a valid uid", async () => {
		// AddExisting gives teachers a uid; Clear keeps those.
		await system.ask(ref, SharingMessages.AddExisting([
			{ uid: toId("u1"), name: "Alice" },
		]));
		await system.ask(ref, SharingMessages.Clear());
		expect(state().teachers).toHaveLength(1);
	});
});

describe("SharingActor — AddEntry (async, with UserStore stub)", () => {
	let system: ActorSystem;
	let ref: Awaited<ReturnType<typeof system.createActor>>;
	let savedUserStore: string | undefined;

	beforeEach(async () => {
		savedUserStore = actorUris["UserStore"];
		system = await ActorSystem.create({ systemName: "test", logger: silentLogger as any });
	});

	afterEach(async () => {
		actorUris["UserStore"] = savedUserStore as any;
		await system.shutdown();
	});

	const state = () => getActorState<SharingState>(system, "QuizSharing");

	const waitForState = (predicate: () => boolean) =>
		new Promise<void>((resolve, reject) => {
			const deadline = Date.now() + 1000;
			const poll = () => {
				if (predicate()) return resolve();
				if (Date.now() > deadline) return reject(new Error("timed out waiting for state"));
				setTimeout(poll, 10);
			};
			poll();
		});

	it("AddEntry adds teacher when UserStore returns a user", async () => {
		actorUris["UserStore"] = toActorUri(
			await createStub(system, "UserStore", () => ({ uid: "u1", username: "Alice" }))
		);
		ref = await system.createActor(SharingActor, { name: "QuizSharing" });

		await system.ask(ref, SharingMessages.AddEntry("alice@example.com"));
		await waitForState(() => state().teachers.length > 0);

		expect(state().teachers).toHaveLength(1);
		expect(state().teachers[0]).toMatchObject({ uid: "u1", name: "Alice" });
	});

	it("AddEntry records a not-found error when UserStore returns no uid", async () => {
		actorUris["UserStore"] = toActorUri(
			await createStub(system, "UserStore", () => ({ error: "not found" }))
		);
		ref = await system.createActor(SharingActor, { name: "QuizSharing" });

		await system.ask(ref, SharingMessages.AddEntry("nobody@example.com"));
		await waitForState(() => state().errors.length > 0);

		const errors = state().errors;
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({ queryNotFound: "nobody@example.com" });
	});

	it("AddEntry records an already-exists error for duplicate teacher", async () => {
		actorUris["UserStore"] = toActorUri(
			await createStub(system, "UserStore", () => ({ uid: "u1", username: "Alice" }))
		);
		ref = await system.createActor(SharingActor, { name: "QuizSharing" });

		// Add once successfully
		await system.ask(ref, SharingMessages.AddEntry("alice@example.com"));
		await waitForState(() => state().teachers.length === 1);

		// Add the same person again
		await system.ask(ref, SharingMessages.AddEntry("alice@example.com"));
		await waitForState(() => state().errors.length > 0);

		expect(state().teachers).toHaveLength(1);
		expect(state().errors[0]).toMatchObject({ alreadyExists: "Alice" });
	});

	it("DeleteError removes the error by id", async () => {
		actorUris["UserStore"] = toActorUri(
			await createStub(system, "UserStore", () => ({ error: "not found" }))
		);
		ref = await system.createActor(SharingActor, { name: "QuizSharing" });

		await system.ask(ref, SharingMessages.AddEntry("nobody@example.com"));
		await waitForState(() => state().errors.length > 0);
		const errorId = state().errors[0].id;

		await system.ask(ref, SharingMessages.DeleteError(errorId));
		expect(state().errors).toHaveLength(0);
	});
});
