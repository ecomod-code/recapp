import { ActorSystem } from "ts-actors";
import { toTimestamp } from "itu-utils";
import { QuizActor } from "../src/actors/QuizActor";
import { QuizActorMessages } from "@recapp/models";

function makeQuiz() {
	return {
		title: "Test Quiz",
		description: "",
		state: "EDITING" as const,
		groups: [],
		comments: [],
		studentQuestions: true,
		studentComments: true,
		studentParticipationSettings: { NAME: true, NICKNAME: true, ANONYMOUS: true },
		allowedQuestionTypesSettings: { SINGLE: true, MULTIPLE: true, TEXT: true },
		shuffleQuestions: false,
		shuffleAnswers: false,
		hideComments: false,
		teachers: [],
		students: [],
		created: toTimestamp(),
		updated: toTimestamp(),
	};
}

describe("QuizActor", () => {
	let system: ActorSystem;

	beforeEach(async () => {
		system = await ActorSystem.create({ systemName: "test" });
	});

	afterEach(async () => {
		await system.shutdown();
	});

	test("update on non-existent quiz rejects with 'Quiz not found'", async () => {
		const ref = await system.createActor(QuizActor, { name: "QuizActor" });
		await expect(
			system.ask(ref, QuizActorMessages.Update({ uid: "quiz-1" as any, title: "New title" }))
		).rejects.toThrow("Quiz not found");
	});

	test("Has for non-existent quiz returns false", async () => {
		const ref = await system.createActor(QuizActor, { name: "QuizActor" });
		const result = await system.ask(ref, QuizActorMessages.Has("quiz-missing" as any));
		expect(result).toBe(false);
	});

	test("Get for non-existent quiz rejects", async () => {
		const ref = await system.createActor(QuizActor, { name: "QuizActor" });
		await expect(
			system.ask(ref, QuizActorMessages.Get("quiz-missing" as any))
		).rejects.toBeInstanceOf(Error);
	});

	test("create with valid data returns a uid string", async () => {
		const ref = await system.createActor(QuizActor, { name: "QuizActor" });
		const result = await system.ask(ref, QuizActorMessages.Create(makeQuiz()));
		expect(typeof result).toBe("string");
		expect(result).toBeTruthy();
	});

	test("create then update with invalid payload returns a serialized error", async () => {
		const ref = await system.createActor(QuizActor, { name: "QuizActor" });
		const uid = (await system.ask(ref, QuizActorMessages.Create(makeQuiz()))) as any;
		const result = await system.ask(ref, QuizActorMessages.Update({ uid, title: 5 as any }));
		expect(result).toHaveProperty("name");
	});

	test("create then Has returns true", async () => {
		const ref = await system.createActor(QuizActor, { name: "QuizActor" });
		const uid = (await system.ask(ref, QuizActorMessages.Create(makeQuiz()))) as any;
		const result = await system.ask(ref, QuizActorMessages.Has(uid));
		expect(result).toBe(true);
	});
});
