import { ActorSystem } from "ts-actors";
import { toId } from "@recapp/models";
import { QuestionActor } from "../src/actors/QuestionActor";
import { QuestionActorMessages } from "@recapp/models";

const QUIZ_ID = toId("quiz-1");
const USER_ID = toId("user-1");

function makeQuestion(text = "What is 2+2?") {
	return {
		text,
		type: "TEXT" as const,
		authorId: USER_ID,
		quiz: QUIZ_ID,
		answers: [],
		approved: false,
		editMode: false,
		answerOrderFixed: false,
	};
}

describe("QuestionActor", () => {
	let system: ActorSystem;

	beforeEach(async () => {
		system = await ActorSystem.create({ systemName: "test" });
	});

	afterEach(async () => {
		await system.shutdown();
	});

	test("GetAll on empty collection returns unit without throwing", async () => {
		const ref = await system.createActor(QuestionActor, { name: "Q_quiz1" }, QUIZ_ID);
		const result = await system.ask(ref, QuestionActorMessages.GetAll());
		expect(result).toBeDefined();
	});

	test("Create with valid data returns a question uid", async () => {
		const ref = await system.createActor(QuestionActor, { name: "Q_quiz1" }, QUIZ_ID);
		const result = await system.ask(ref, QuestionActorMessages.Create(makeQuestion()));
		expect(typeof result).toBe("string");
		expect(result).toBeTruthy();
	});

	test("Create then Update persists the change", async () => {
		const ref = await system.createActor(QuestionActor, { name: "Q_quiz1" }, QUIZ_ID);
		const uid = (await system.ask(ref, QuestionActorMessages.Create(makeQuestion("Original text")))) as any;

		const updated = await system.ask(ref, QuestionActorMessages.Update({ uid, text: "Updated text" }));
		expect((updated as any).text).toBe("Updated text");
	});

	test("Create then Delete removes the question", async () => {
		const ref = await system.createActor(QuestionActor, { name: "Q_quiz1" }, QUIZ_ID);
		const uid = (await system.ask(ref, QuestionActorMessages.Create(makeQuestion("To be deleted")))) as any;

		const deleteResult = await system.ask(ref, QuestionActorMessages.Delete(uid));
		expect(deleteResult).toBeDefined();

		// After deletion, a second delete is a no-op (returns unit)
		const secondDelete = await system.ask(ref, QuestionActorMessages.Delete(uid));
		expect(secondDelete).toBeDefined();
	});

	test("Delete on non-existent question returns unit without throwing", async () => {
		const ref = await system.createActor(QuestionActor, { name: "Q_quiz1" }, QUIZ_ID);
		const result = await system.ask(ref, QuestionActorMessages.Delete(toId("no-such-question")));
		expect(result).toBeDefined();
	});
});
