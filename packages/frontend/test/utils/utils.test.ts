import { describe, it, expect } from "vitest";
import { shuffle, isMultiChoiceAnsweredCorrectly, checkIsCreatingQuestionDisabled, checkIsParticipationDisabled } from "../../src/utils";
import type { Question } from "@recapp/models";

// Minimal Question factory — only the fields isMultiChoiceAnsweredCorrectly reads
function makeQuestion(correctFlags: boolean[]): Question {
	return {
		uid: "q1",
		created: { value: 0, type: "Timestamp" },
		updated: { value: 0, type: "Timestamp" },
		text: "Q",
		type: "MULTIPLE",
		authorId: "u1",
		quiz: "quiz1",
		answers: correctFlags.map((correct, i) => ({ text: `opt${i}`, correct })),
		approved: true,
		editMode: false,
		answerOrderFixed: false,
	} as unknown as Question;
}

// Deterministic RNG for shuffle tests
const seqRng = (values: number[]) => {
	let i = 0;
	return () => values[i++ % values.length];
};

describe("shuffle", () => {
	it("returns the same length as input", () => {
		const rng = seqRng([0.1, 0.5, 0.9, 0.2, 0.8]);
		expect(shuffle(rng, [1, 2, 3, 4, 5])).toHaveLength(5);
	});

	it("contains all original elements", () => {
		const rng = seqRng([0.9, 0.1, 0.6, 0.3, 0.7]);
		const result = shuffle(rng, [1, 2, 3, 4, 5]);
		expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
	});

	it("returns empty array for empty input", () => {
		expect(shuffle(() => 0.5, [])).toEqual([]);
	});

	it("returns single-element array unchanged", () => {
		expect(shuffle(() => 0.5, ["a"])).toEqual(["a"]);
	});

	it("is curried — accepts rng first, list second", () => {
		const shuffleWithRng = shuffle(() => 0.5);
		expect(shuffleWithRng([1, 2, 3])).toHaveLength(3);
	});
});

describe("isMultiChoiceAnsweredCorrectly", () => {
	it("returns false for empty answers", () => {
		const q = makeQuestion([true, false]);
		expect(isMultiChoiceAnsweredCorrectly([], q)).toBe(false);
	});

	it("returns true when all answers match", () => {
		const q = makeQuestion([true, false, true]);
		expect(isMultiChoiceAnsweredCorrectly([true, false, true], q)).toBe(true);
	});

	it("returns false when one answer is wrong", () => {
		const q = makeQuestion([true, false]);
		expect(isMultiChoiceAnsweredCorrectly([false, false], q)).toBe(false);
	});

	it("pads short answer array with false", () => {
		// question has 3 options: [true, false, false]
		// student provides [true] — gets padded to [true, false, false] → correct
		const q = makeQuestion([true, false, false]);
		expect(isMultiChoiceAnsweredCorrectly([true], q)).toBe(true);
	});

	it("returns false when padding would mismatch", () => {
		// question has [true, true]; student provides [true] → padded to [true, false] → wrong
		const q = makeQuestion([true, true]);
		expect(isMultiChoiceAnsweredCorrectly([true], q)).toBe(false);
	});

	it("returns false when question is undefined", () => {
		expect(isMultiChoiceAnsweredCorrectly([true, false], undefined)).toBe(false);
	});
});

describe("checkIsCreatingQuestionDisabled", () => {
	it("returns true when all question types are disabled", () => {
		expect(checkIsCreatingQuestionDisabled({ SINGLE: false, MULTIPLE: false, TEXT: false })).toBe(true);
	});

	it("returns false when at least one type is enabled", () => {
		expect(checkIsCreatingQuestionDisabled({ SINGLE: true, MULTIPLE: false, TEXT: false })).toBe(false);
	});

	it("returns false when all types are enabled", () => {
		expect(checkIsCreatingQuestionDisabled({ SINGLE: true, MULTIPLE: true, TEXT: true })).toBe(false);
	});
});

describe("checkIsParticipationDisabled", () => {
	it("returns true when all participation modes are disabled", () => {
		expect(checkIsParticipationDisabled({ NAME: false, NICKNAME: false, ANONYMOUS: false })).toBe(true);
	});

	it("returns false when at least one mode is enabled", () => {
		expect(checkIsParticipationDisabled({ NAME: true, NICKNAME: false, ANONYMOUS: false })).toBe(false);
	});

	it("returns false when all modes are enabled", () => {
		expect(checkIsParticipationDisabled({ NAME: true, NICKNAME: true, ANONYMOUS: true })).toBe(false);
	});
});
