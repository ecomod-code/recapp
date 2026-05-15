import { describe, it, expect } from "vitest";
import {
	textElementStatisticsSchema,
	choiceElementStatisticsSchema,
	groupStatisticsSchema,
} from "../src/data/statistics";

const validRawTs = { value: 1_700_000_000_000, type: "Timestamp" as const };

const baseEntity = {
	uid: "stat-1",
	created: validRawTs,
	updated: validRawTs,
};

describe("textElementStatisticsSchema", () => {
	const valid = {
		...baseEntity,
		tag: "TextElementStatistics" as const,
		questionId: "q-1",
		groupName: "Group A",
		quizId: "quiz-1",
		maximumParticipants: 30,
		participants: 20,
		answers: ["answer 1", "answer 2"],
		wrong: 5,
	};

	it("parses a valid text statistics object", () => {
		const result = textElementStatisticsSchema.parse(valid);
		expect(result.tag).toBe("TextElementStatistics");
		expect(result.participants).toBe(20);
		expect(result.answers).toHaveLength(2);
	});

	it("rejects wrong tag", () => {
		expect(() =>
			textElementStatisticsSchema.parse({ ...valid, tag: "ChoiceElementStatistics" })
		).toThrow();
	});

	it("rejects float for maximumParticipants", () => {
		expect(() =>
			textElementStatisticsSchema.parse({ ...valid, maximumParticipants: 10.5 })
		).toThrow();
	});

	it("rejects float for participants", () => {
		expect(() =>
			textElementStatisticsSchema.parse({ ...valid, participants: 1.1 })
		).toThrow();
	});

	it("rejects float for wrong", () => {
		expect(() =>
			textElementStatisticsSchema.parse({ ...valid, wrong: 0.9 })
		).toThrow();
	});

	it("accepts empty answers array", () => {
		const result = textElementStatisticsSchema.parse({ ...valid, answers: [] });
		expect(result.answers).toHaveLength(0);
	});

	it("rejects non-string entries in answers", () => {
		expect(() =>
			textElementStatisticsSchema.parse({ ...valid, answers: [42] })
		).toThrow();
	});

	it("rejects missing questionId", () => {
		const { questionId: _q, ...rest } = valid;
		expect(() => textElementStatisticsSchema.parse(rest)).toThrow();
	});
});

describe("choiceElementStatisticsSchema", () => {
	const valid = {
		...baseEntity,
		tag: "ChoiceElementStatistics" as const,
		questionId: "q-2",
		groupName: "Group B",
		quizId: "quiz-1",
		maximumParticipants: 30,
		participants: 25,
		passed: 18,
		answers: [10, 8, 7],
		wrong: 2,
	};

	it("parses a valid choice statistics object", () => {
		const result = choiceElementStatisticsSchema.parse(valid);
		expect(result.tag).toBe("ChoiceElementStatistics");
		expect(result.passed).toBe(18);
		expect(result.answers).toEqual([10, 8, 7]);
	});

	it("rejects wrong tag", () => {
		expect(() =>
			choiceElementStatisticsSchema.parse({ ...valid, tag: "TextElementStatistics" })
		).toThrow();
	});

	it("rejects float in answers array", () => {
		expect(() =>
			choiceElementStatisticsSchema.parse({ ...valid, answers: [1.5, 2] })
		).toThrow();
	});

	it("rejects float for passed", () => {
		expect(() =>
			choiceElementStatisticsSchema.parse({ ...valid, passed: 3.3 })
		).toThrow();
	});

	it("accepts zero participants and zero wrong", () => {
		const result = choiceElementStatisticsSchema.parse({
			...valid,
			participants: 0,
			wrong: 0,
			passed: 0,
			answers: [],
		});
		expect(result.participants).toBe(0);
	});

	it("rejects missing passed field", () => {
		const { passed: _p, ...rest } = valid;
		expect(() => choiceElementStatisticsSchema.parse(rest)).toThrow();
	});
});

describe("groupStatisticsSchema", () => {
	const valid = {
		groupName: "Overall",
		quizId: "quiz-1",
		maximumParticipants: 50,
		answers: [40, 45, 30],
		correctAnswers: [35, 40, 25],
		questionIds: ["q-1", "q-2", "q-3"],
		wrongAnswers: [5, 5, 5],
	};

	it("parses a valid group statistics object", () => {
		const result = groupStatisticsSchema.parse(valid);
		expect(result.groupName).toBe("Overall");
		expect(result.questionIds).toHaveLength(3);
	});

	it("accepts empty arrays", () => {
		const result = groupStatisticsSchema.parse({
			...valid,
			answers: [],
			correctAnswers: [],
			questionIds: [],
			wrongAnswers: [],
		});
		expect(result.answers).toHaveLength(0);
	});

	it("rejects floats in correctAnswers", () => {
		expect(() =>
			groupStatisticsSchema.parse({ ...valid, correctAnswers: [1.1] })
		).toThrow();
	});

	it("rejects floats in wrongAnswers", () => {
		expect(() =>
			groupStatisticsSchema.parse({ ...valid, wrongAnswers: [0.5] })
		).toThrow();
	});

	it("rejects missing groupName", () => {
		const { groupName: _g, ...rest } = valid;
		expect(() => groupStatisticsSchema.parse(rest)).toThrow();
	});

	it("rejects missing quizId", () => {
		const { quizId: _q, ...rest } = valid;
		expect(() => groupStatisticsSchema.parse(rest)).toThrow();
	});

	it("rejects non-integer maximumParticipants", () => {
		expect(() =>
			groupStatisticsSchema.parse({ ...valid, maximumParticipants: 10.5 })
		).toThrow();
	});
});
