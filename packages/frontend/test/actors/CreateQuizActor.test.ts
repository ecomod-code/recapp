import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ActorSystem } from "ts-actors";
import { CreateQuizActor, CreateQuizMessages, CreateQuizState } from "../../src/actors/CreateQuizActor";
import { actorUris } from "../../src/actorUris";
import { toActorUri } from "@recapp/models";
import { createStub, getActorState } from "./stubs";

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

describe("CreateQuizActor — Update (validation)", () => {
	let system: ActorSystem;
	let ref: Awaited<ReturnType<typeof system.createActor>>;

	beforeEach(async () => {
		system = await ActorSystem.create({ systemName: "test", logger: silentLogger as any });
		ref = await system.createActor(CreateQuizActor, { name: "CreateQuiz" });
	});

	afterEach(async () => {
		await system.shutdown();
	});

	const state = () => getActorState<CreateQuizState>(system, "CreateQuiz");

	it("starts with empty title and title validation false", () => {
		expect(state().quiz.title).toBe("");
		expect(state().validation.title).toBe(false);
	});

	it("Update with a title of >= 1 char sets validation.title to true", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "My Quiz" }));
		expect(state().validation.title).toBe(true);
	});

	it("Update with empty title keeps validation.title false", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "" }));
		expect(state().validation.title).toBe(false);
	});

	it("Update with whitespace-only title keeps validation.title false", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "   " }));
		expect(state().validation.title).toBe(false);
	});

	it("Update merges partial updates into quiz state", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "Quiz A", description: "Desc" }));
		const s = state();
		expect(s.quiz.title).toBe("Quiz A");
		expect(s.quiz.description).toBe("Desc");
	});

	it("ResetData restores empty title and false validation", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "Quiz A" }));
		await system.ask(ref, CreateQuizMessages.ResetData());
		const s = state();
		expect(s.quiz.title).toBe("");
		expect(s.validation.title).toBe(false);
	});
});

describe("CreateQuizActor — CreateQuiz", () => {
	let system: ActorSystem;
	let ref: Awaited<ReturnType<typeof system.createActor>>;
	// Save and restore actorUris entries we override
	let savedLocalUser: string | undefined;
	let savedQuizActor: string | undefined;

	beforeEach(async () => {
		savedLocalUser = actorUris["LocalUser"];
		savedQuizActor = actorUris["QuizActor"];
		system = await ActorSystem.create({ systemName: "test", logger: silentLogger as any });

		// Register stub actors and point actorUris to them
		actorUris["LocalUser"] = toActorUri(await createStub(system, "LocalUser", () => "uid-teacher-1"));
		actorUris["QuizActor"] = toActorUri(await createStub(system, "QuizActor", () => "new-quiz-uid"));

		ref = await system.createActor(CreateQuizActor, { name: "CreateQuiz" });
	});

	afterEach(async () => {
		actorUris["LocalUser"] = savedLocalUser as any;
		actorUris["QuizActor"] = savedQuizActor as any;
		await system.shutdown();
	});

	const state = () => getActorState<CreateQuizState>(system, "CreateQuiz");

	it("CreateQuiz rejects when validation fails (empty title)", async () => {
		// ts-actors ask() rejects when the actor's receive() returns an Error instance
		await expect(system.ask(ref, CreateQuizMessages.CreateQuiz())).rejects.toThrow(/not validated/i);
	});

	it("CreateQuiz succeeds and returns a uid when title is valid", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "Valid Quiz" }));
		const result = await system.ask(ref, CreateQuizMessages.CreateQuiz());
		expect(result).toBe("new-quiz-uid");
	});

	it("CreateQuiz resets form state on success", async () => {
		await system.ask(ref, CreateQuizMessages.Update({ title: "Valid Quiz" }));
		await system.ask(ref, CreateQuizMessages.CreateQuiz());
		// Give the async ResetData send time to process
		await new Promise(r => setTimeout(r, 50));
		expect(state().quiz.title).toBe("");
		expect(state().validation.title).toBe(false);
	});
});
