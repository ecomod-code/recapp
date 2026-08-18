import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ActorSystem } from "ts-actors";
import { maybe } from "tsmonads";
import { toId } from "@recapp/models";
import type { Id, Quiz, QuizRun, Question, User } from "@recapp/models";
import { CurrentQuizActor, CurrentQuizMessages, CurrentQuizState } from "../../src/actors/CurrentQuizActor";
import { actorUris } from "../../src/actorUris";
import { createStub, getActorState } from "./stubs";

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} };

const QUIZ_ID = "quiz-1";
const QUESTION_ID = "q1";

// A single-choice question with a known-correct answer, so LogAnswer's
// correctness path runs without throwing.
const question = {
	uid: toId(QUESTION_ID),
	type: "SINGLE",
	approved: true,
	answers: [
		{ text: "A", correct: true },
		{ text: "B", correct: false },
	],
} as unknown as Question;

const quiz = {
	uid: toId(QUIZ_ID),
	state: "STARTED",
	groups: [{ name: "DEFAULT", questions: [toId(QUESTION_ID)] }],
	students: [],
	shuffleQuestions: false,
} as unknown as Quiz;

const user = { uid: toId("student-1"), role: "STUDENT" } as unknown as User;

const makeRun = (): QuizRun =>
	({
		uid: toId("run-1"),
		studentId: toId("student-1"),
		quizId: toId(QUIZ_ID),
		questions: [toId(QUESTION_ID)],
		counter: 0,
		answers: [],
		correct: [],
		wrong: [],
	}) as unknown as QuizRun;

describe("CurrentQuizActor — LogAnswer buffering before run init", () => {
	let system: ActorSystem;
	let ref: Awaited<ReturnType<typeof system.createActor>>;
	// Prefixes we repoint at test stubs; restored afterEach.
	let saved: Record<string, string | undefined> = {};

	const state = () => getActorState<CurrentQuizState>(system, "CurrentQuiz");
	const actor = () => {
		const r = system.getActorRef(`actors://test/CurrentQuiz`) as any;
		if (r instanceof Error) throw r;
		return r.actor as CurrentQuizActor & { quiz: unknown; user: unknown; state: CurrentQuizState };
	};

	beforeEach(async () => {
		saved = {
			QuizRunActorPrefix: actorUris["QuizRunActorPrefix"],
			QuestionActorPrefix: actorUris["QuestionActorPrefix"],
			StatsActorPrefix: actorUris["StatsActorPrefix"],
		};
		system = await ActorSystem.create({ systemName: "test", logger: silentLogger as any });

		// Point the per-quiz actor prefixes at stubs living in this test system.
		actorUris["QuizRunActorPrefix"] = "actors://test/QRun_" as any;
		actorUris["QuestionActorPrefix"] = "actors://test/Quest_" as any;
		actorUris["StatsActorPrefix"] = "actors://test/Stats_" as any;

		// GetForUser (ask) resolves to a fresh run at counter 0; Update (send) is ignored.
		await createStub(system, `QRun_${QUIZ_ID}`, () => makeRun());
		await createStub(system, `Quest_${QUIZ_ID}`, () => undefined);
		await createStub(system, `Stats_${QUIZ_ID}`, () => undefined);

		ref = await system.createActor(CurrentQuizActor, { name: "CurrentQuiz" });

		// Wire the actor's identity and a minimal loaded state.
		const a = actor();
		a.quiz = maybe(toId(QUIZ_ID));
		a.user = maybe(user);
		a.state = {
			...a.state,
			quiz,
			questions: [question],
			run: undefined,
		};
	});

	afterEach(async () => {
		actorUris["QuizRunActorPrefix"] = saved.QuizRunActorPrefix as any;
		actorUris["QuestionActorPrefix"] = saved.QuestionActorPrefix as any;
		actorUris["StatsActorPrefix"] = saved.StatsActorPrefix as any;
		await system.shutdown();
	});

	it("buffers the answer (does not silently drop it) when run is undefined", async () => {
		expect(state().run).toBeUndefined();

		await system.ask(
			ref,
			CurrentQuizMessages.LogAnswer({ questionId: toId(QUESTION_ID), answer: [true, false] })
		);

		const s = state();
		// Nothing was recorded against a (non-existent) run …
		expect(s.run).toBeUndefined();
		// … but the answer is retained for later instead of being lost.
		expect(s.pendingAnswer).toEqual({ questionId: toId(QUESTION_ID), answer: [true, false] });
	});

	it("applies the buffered answer once run initialises via GetRun", async () => {
		// 1) Answer selected while run is still undefined → buffered.
		await system.ask(
			ref,
			CurrentQuizMessages.LogAnswer({ questionId: toId(QUESTION_ID), answer: [true, false] })
		);
		expect(state().pendingAnswer).toBeDefined();

		// 2) Run initialises. GetRun sets state.run and flushes the buffer, which
		//    re-dispatches LogAnswer; that send is async, so allow it to drain.
		await system.ask(ref, CurrentQuizMessages.GetRun());
		await new Promise(r => setTimeout(r, 50));

		const s = state();
		expect(s.run).toBeDefined();
		// The previously-buffered answer has now been logged exactly once.
		expect(s.pendingAnswer).toBeUndefined();
		expect(s.run!.counter).toBe(1);
		expect(s.run!.answers).toHaveLength(1);
		expect(s.run!.answers[0]).toEqual([true, false]);
	});
});
