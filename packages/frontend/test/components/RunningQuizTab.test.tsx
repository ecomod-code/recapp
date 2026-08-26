import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { toId, Question, QuizRun } from "@recapp/models";
import { toTimestamp } from "itu-utils";
import { RunningQuizTab } from "../../src/components/quiz-tabs/RunningQuizTab";
import type { CurrentQuizState } from "../../src/actors/CurrentQuizActor";

vi.mock("@lingui/react", async importOriginal => {
	const actual = await importOriginal<typeof import("@lingui/react")>();
	return { ...actual, Trans: ({ id }: { id: string }) => <span>{id}</span> };
});

// Render markdown synchronously — this test is about the reset/guard logic, not the
// async unified pipeline (whose late setState would otherwise trigger act() warnings).
vi.mock("../../src/hooks/useRendered", () => ({
	useRendered: ({ value }: { value: string }) => ({ rendered: value, isStale: false }),
}));

function makeQuestion(uid: string, optionCount: number): Question {
	return {
		uid: toId(uid),
		text: `Question ${uid}`,
		type: "MULTIPLE",
		authorId: toId("author-1"),
		quiz: toId("quiz-1"),
		answers: Array.from({ length: optionCount }, (_, i) => ({ text: `opt-${i}`, correct: i === 0 })),
		approved: true,
		editMode: false,
		created: toTimestamp(),
		updated: toTimestamp(),
	} as unknown as Question;
}

function makeState(counter: number): CurrentQuizState {
	const run: QuizRun = {
		uid: toId("run-1"),
		studentId: toId("student-1"),
		quizId: toId("quiz-1"),
		questions: [toId("q1"), toId("q2")],
		counter,
		answers: [],
		correct: [],
		wrong: [],
		created: toTimestamp(),
		updated: toTimestamp(),
	} as unknown as QuizRun;
	return {
		quiz: { uid: toId("quiz-1") },
		comments: [],
		// q1 has 4 options, q2 has 2 — the shrinking adjacency that triggered the crash.
		questions: [makeQuestion("q1", 4), makeQuestion("q2", 2)],
		teacherNames: [],
		run,
	} as unknown as CurrentQuizState;
}

const renderTab = (quizState: CurrentQuizState) => (
	<RunningQuizTab
		isUserInTeachersList={false}
		onClickAddComment={vi.fn()}
		quizState={quizState}
		logQuestion={vi.fn()}
	/>
);

describe("RunningQuizTab — advance to a lower-option question", () => {
	// Regression for answers-length-render-crash: selecting an option on a 4-option
	// question then advancing to a 2-option one left stale `answers` (length 4) that
	// isMultiChoiceAnsweredCorrectly indexed out of bounds during render. The in-render
	// reset keys on questionId and the utils guard clamps the mismatch.
	it("does not crash and resets the selection when the next question has fewer options", () => {
		const { rerender } = render(renderTab(makeState(0)));

		// Q1: four options — select the first so `answers` is sized to 4.
		const q1Checkboxes = screen.getAllByRole("checkbox");
		expect(q1Checkboxes).toHaveLength(4);
		fireEvent.click(q1Checkboxes[0]);
		expect(q1Checkboxes[0]).toBeChecked();

		// Advance to Q2 (two options). The stale 4-length selection reaches the render
		// where the current question already has 2 options — must not throw.
		expect(() => rerender(renderTab(makeState(1)))).not.toThrow();

		// Q2 is shown with its two options and the stale selection has been cleared.
		const q2Checkboxes = screen.getAllByRole("checkbox");
		expect(q2Checkboxes).toHaveLength(2);
		q2Checkboxes.forEach(cb => expect(cb).not.toBeChecked());
	});
});
