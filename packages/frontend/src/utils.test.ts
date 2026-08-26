import { describe, it, expect } from "vitest";
import { Question } from "@recapp/models";
import { isMultiChoiceAnsweredCorrectly } from "./utils";

// The function only reads `question.answers`, so a minimal shape is enough.
const questionWith = (correct: boolean[]): Question =>
	({ answers: correct.map(c => ({ text: "", correct: c })) }) as unknown as Question;

describe("isMultiChoiceAnsweredCorrectly", () => {
	it("returns false for an empty selection", () => {
		expect(isMultiChoiceAnsweredCorrectly([], questionWith([true, false]))).toBe(false);
	});

	it("returns false when question is undefined", () => {
		expect(isMultiChoiceAnsweredCorrectly([true], undefined)).toBe(false);
	});

	it("returns true when the selection matches the correct answers", () => {
		const question = questionWith([true, false, true]);
		expect(isMultiChoiceAnsweredCorrectly([true, false, true], question)).toBe(true);
	});

	it("returns false when the selection does not match", () => {
		const question = questionWith([true, false, true]);
		expect(isMultiChoiceAnsweredCorrectly([true, true, false], question)).toBe(false);
	});

	it("pads a too-short selection with false and still evaluates correctly", () => {
		// Trailing unselected options are equivalent to `false` entries.
		const question = questionWith([true, false, false]);
		expect(isMultiChoiceAnsweredCorrectly([true], question)).toBe(true);
	});

	// Regression: answers-length render crash. A stale selection sized to a previous,
	// larger question must NOT index question.answers out of bounds — it returns false.
	it("returns false (no crash) when the selection is longer than the question's options", () => {
		const question = questionWith([true, false]);
		expect(() => isMultiChoiceAnsweredCorrectly([true, false, true], question)).not.toThrow();
		expect(isMultiChoiceAnsweredCorrectly([true, false, true], question)).toBe(false);
	});
});
