import { describe, it, expect } from "vitest";
import {
	answerSchema,
	questionTypesSchema,
	questionSchema,
	questionGroupSchema,
	runOptionsSchema,
	quizRunSchema,
	quizSchema,
	testPackage,
	examAnswer,
	examFeedback,
	isInTeachersList,
	isInStudentList,
} from "../src/data/quiz";
import { toId } from "../src/data/base";
import type { Quiz } from "../src/data/quiz";

const validRawTs = { value: 1_700_000_000_000, type: "Timestamp" as const };
const baseEntity = { uid: "ent-1", created: validRawTs, updated: validRawTs };

const participationSettings = { NAME: true, NICKNAME: true, ANONYMOUS: false };
const questionTypesSettings = { SINGLE: true, MULTIPLE: true, TEXT: false };

const validQuizBase = {
	...baseEntity,
	title: "My Quiz",
	description: "A test quiz",
	state: "EDITING" as const,
	uniqueLink: "my-quiz-link",
	groups: [],
	comments: [],
	studentQuestions: true,
	studentComments: false,
	studentParticipationSettings: participationSettings,
	allowedQuestionTypesSettings: questionTypesSettings,
	shuffleQuestions: false,
	teachers: ["teacher-1"],
	students: [],
};

// ─── answerSchema ────────────────────────────────────────────────────────────

describe("answerSchema", () => {
	it("parses a correct answer", () => {
		const result = answerSchema.parse({ text: "Paris", correct: true });
		expect(result.text).toBe("Paris");
		expect(result.correct).toBe(true);
	});

	it("parses an incorrect answer", () => {
		const result = answerSchema.parse({ text: "Berlin", correct: false });
		expect(result.correct).toBe(false);
	});

	it("rejects missing text", () => {
		expect(() => answerSchema.parse({ correct: true })).toThrow();
	});

	it("rejects missing correct", () => {
		expect(() => answerSchema.parse({ text: "Paris" })).toThrow();
	});

	it("rejects non-boolean correct", () => {
		expect(() => answerSchema.parse({ text: "Paris", correct: "true" })).toThrow();
	});
});

// ─── questionTypesSchema ──────────────────────────────────────────────────────

describe("questionTypesSchema", () => {
	it.each(["SINGLE", "MULTIPLE", "TEXT"] as const)("accepts %s", type => {
		expect(questionTypesSchema.parse(type)).toBe(type);
	});

	it("rejects unknown type", () => {
		expect(() => questionTypesSchema.parse("OPEN")).toThrow();
	});
});

// ─── questionSchema ───────────────────────────────────────────────────────────

describe("questionSchema", () => {
	const validQuestion = {
		...baseEntity,
		text: "What is the capital of France?",
		type: "SINGLE" as const,
		authorId: "user-1",
		quiz: "quiz-1",
		answers: [
			{ text: "Paris", correct: true },
			{ text: "Berlin", correct: false },
		],
		approved: true,
		editMode: false,
	};

	it("parses a minimal valid question", () => {
		const result = questionSchema.parse(validQuestion);
		expect(result.text).toBe("What is the capital of France?");
		expect(result.type).toBe("SINGLE");
		expect(result.approved).toBe(true);
		expect(result.editMode).toBe(false);
		expect(result.answerOrderFixed).toBe(false); // default
		expect(result.hint).toBeUndefined();
		expect(result.statistics).toBeUndefined();
	});

	it("parses a TEXT question with empty answers", () => {
		const result = questionSchema.parse({ ...validQuestion, type: "TEXT", answers: [] });
		expect(result.answers).toHaveLength(0);
	});

	it("parses optional hint and authorName", () => {
		const result = questionSchema.parse({
			...validQuestion,
			hint: "Think about European capitals",
			authorName: "Prof. Alice",
			authorFingerprint: "fp-abc",
		});
		expect(result.hint).toBe("Think about European capitals");
		expect(result.authorName).toBe("Prof. Alice");
		expect(result.authorFingerprint).toBe("fp-abc");
	});

	it("applies answerOrderFixed default of false", () => {
		const result = questionSchema.parse(validQuestion);
		expect(result.answerOrderFixed).toBe(false);
	});

	it("accepts answerOrderFixed: true", () => {
		const result = questionSchema.parse({ ...validQuestion, answerOrderFixed: true });
		expect(result.answerOrderFixed).toBe(true);
	});

	it("rejects missing text", () => {
		const { text: _t, ...rest } = validQuestion;
		expect(() => questionSchema.parse(rest)).toThrow();
	});

	it("rejects missing type", () => {
		const { type: _t, ...rest } = validQuestion;
		expect(() => questionSchema.parse(rest)).toThrow();
	});

	it("rejects invalid type", () => {
		expect(() => questionSchema.parse({ ...validQuestion, type: "ESSAY" })).toThrow();
	});

	it("rejects missing quiz", () => {
		const { quiz: _q, ...rest } = validQuestion;
		expect(() => questionSchema.parse(rest)).toThrow();
	});

	it("rejects non-boolean approved", () => {
		expect(() => questionSchema.parse({ ...validQuestion, approved: 1 })).toThrow();
	});

	it("rejects non-array answers", () => {
		expect(() => questionSchema.parse({ ...validQuestion, answers: "wrong" })).toThrow();
	});
});

// ─── questionGroupSchema ──────────────────────────────────────────────────────

describe("questionGroupSchema", () => {
	it("parses a valid group with questions", () => {
		const result = questionGroupSchema.parse({
			name: "Chapter 1",
			questions: ["q-1", "q-2"],
		});
		expect(result.name).toBe("Chapter 1");
		expect(result.questions).toHaveLength(2);
		expect(result.statistics).toBeUndefined();
	});

	it("parses a group with empty questions", () => {
		const result = questionGroupSchema.parse({ name: "Empty", questions: [] });
		expect(result.questions).toHaveLength(0);
	});

	it("rejects missing name", () => {
		expect(() => questionGroupSchema.parse({ questions: [] })).toThrow();
	});

	it("rejects non-string question IDs", () => {
		expect(() =>
			questionGroupSchema.parse({ name: "G", questions: [1, 2] })
		).toThrow();
	});
});

// ─── runOptionsSchema ─────────────────────────────────────────────────────────

describe("runOptionsSchema", () => {
	it("parses empty run options", () => {
		const result = runOptionsSchema.parse({});
		expect(result.runningEntity).toBeUndefined();
	});

	it("parses run options with a runningEntity", () => {
		const result = runOptionsSchema.parse({ runningEntity: "q-1" });
		expect(result.runningEntity).toBe("q-1");
	});
});

// ─── quizRunSchema ────────────────────────────────────────────────────────────

describe("quizRunSchema", () => {
	const validRun = {
		...baseEntity,
		studentId: "student-1",
		quizId: "quiz-1",
		questions: ["q-1", "q-2"],
		counter: 0,
		answers: ["my text answer", [true, false, null]],
		correct: [true],
		wrong: [false],
	};

	it("parses a valid quiz run", () => {
		const result = quizRunSchema.parse(validRun);
		expect(result.studentId).toBe("student-1");
		expect(result.counter).toBe(0);
		expect(result.questions).toHaveLength(2);
	});

	it("parses string answers (text questions)", () => {
		const result = quizRunSchema.parse({
			...validRun,
			answers: ["free text", "another answer"],
		});
		expect(result.answers[0]).toBe("free text");
	});

	it("parses boolean array answers (choice questions)", () => {
		const result = quizRunSchema.parse({
			...validRun,
			answers: [[true, false, null]],
		});
		expect(Array.isArray(result.answers[0])).toBe(true);
	});

	it("rejects float for counter", () => {
		expect(() => quizRunSchema.parse({ ...validRun, counter: 1.5 })).toThrow();
	});

	it("rejects missing studentId", () => {
		const { studentId: _s, ...rest } = validRun;
		expect(() => quizRunSchema.parse(rest)).toThrow();
	});

	it("rejects missing quizId", () => {
		const { quizId: _q, ...rest } = validRun;
		expect(() => quizRunSchema.parse(rest)).toThrow();
	});

	it("accepts empty questions and answers arrays", () => {
		const result = quizRunSchema.parse({
			...validRun,
			questions: [],
			answers: [],
			correct: [],
			wrong: [],
		});
		expect(result.questions).toHaveLength(0);
	});
});

// ─── quizSchema ───────────────────────────────────────────────────────────────

describe("quizSchema", () => {
	it("parses a minimal valid quiz", () => {
		const result = quizSchema.parse(validQuizBase);
		expect(result.title).toBe("My Quiz");
		expect(result.state).toBe("EDITING");
		expect(result.shuffleAnswers).toBe(false); // default
		expect(result.hideComments).toBe(false); // default
		expect(result.previewers).toBeUndefined();
	});

	it.each(["EDITING", "ACTIVE", "STARTED", "STOPPED"] as const)(
		"accepts state %s",
		state => {
			const result = quizSchema.parse({ ...validQuizBase, state });
			expect(result.state).toBe(state);
		}
	);

	it("rejects unknown state", () => {
		expect(() => quizSchema.parse({ ...validQuizBase, state: "PAUSED" })).toThrow();
	});

	it("applies shuffleAnswers default of false", () => {
		const result = quizSchema.parse(validQuizBase);
		expect(result.shuffleAnswers).toBe(false);
	});

	it("accepts shuffleAnswers: true", () => {
		const result = quizSchema.parse({ ...validQuizBase, shuffleAnswers: true });
		expect(result.shuffleAnswers).toBe(true);
	});

	it("applies hideComments default of false", () => {
		const result = quizSchema.parse(validQuizBase);
		expect(result.hideComments).toBe(false);
	});

	it("parses optional previewers array", () => {
		const result = quizSchema.parse({ ...validQuizBase, previewers: ["user-5"] });
		expect(result.previewers).toEqual(["user-5"]);
	});

	it("parses optional studentsCanSeeStatistics", () => {
		const result = quizSchema.parse({ ...validQuizBase, studentsCanSeeStatistics: true });
		expect(result.studentsCanSeeStatistics).toBe(true);
	});

	it("parses runOptions", () => {
		const result = quizSchema.parse({
			...validQuizBase,
			runOptions: { runningEntity: "group-1" },
		});
		expect(result.runOptions?.runningEntity).toBe("group-1");
	});

	it("parses groups with questions", () => {
		const result = quizSchema.parse({
			...validQuizBase,
			groups: [{ name: "G1", questions: ["q-1"] }],
		});
		expect(result.groups).toHaveLength(1);
	});

	it("rejects missing title", () => {
		const { title: _t, ...rest } = validQuizBase;
		expect(() => quizSchema.parse(rest)).toThrow();
	});

	it("rejects missing teachers array", () => {
		const { teachers: _t, ...rest } = validQuizBase;
		expect(() => quizSchema.parse(rest)).toThrow();
	});

	it("rejects non-boolean studentQuestions", () => {
		expect(() =>
			quizSchema.parse({ ...validQuizBase, studentQuestions: "yes" })
		).toThrow();
	});

	it("rejects non-boolean shuffleQuestions", () => {
		expect(() =>
			quizSchema.parse({ ...validQuizBase, shuffleQuestions: 1 })
		).toThrow();
	});
});

// ─── isInTeachersList / isInStudentList ────────────────────────────────────────

describe("isInTeachersList and isInStudentList", () => {
	const makeQuiz = (overrides: Record<string, unknown>): Quiz =>
		quizSchema.parse({ ...validQuizBase, ...overrides }) as Quiz;

	it("isInTeachersList is true when user is a teacher and not a previewer", () => {
		const quiz = makeQuiz({ teachers: ["t-1", "t-2"], previewers: [] });
		expect(isInTeachersList(quiz, toId("t-1"))).toBe(true);
	});

	it("isInTeachersList is false when user is also in previewers", () => {
		const quiz = makeQuiz({ teachers: ["t-1"], previewers: ["t-1"] });
		expect(isInTeachersList(quiz, toId("t-1"))).toBe(false);
	});

	it("isInTeachersList is false when user is not in teachers list", () => {
		const quiz = makeQuiz({ teachers: ["t-1"] });
		expect(isInTeachersList(quiz, toId("other"))).toBe(false);
	});

	it("isInStudentList is true when user is in students", () => {
		const quiz = makeQuiz({ students: ["s-1", "s-2"] });
		expect(isInStudentList(quiz, toId("s-1"))).toBe(true);
	});

	it("isInStudentList is true when user is a previewer", () => {
		const quiz = makeQuiz({ students: [], previewers: ["t-1"] });
		expect(isInStudentList(quiz, toId("t-1"))).toBe(true);
	});

	it("isInStudentList is false when user is neither student nor previewer", () => {
		const quiz = makeQuiz({ students: ["s-1"], previewers: [] });
		expect(isInStudentList(quiz, toId("other"))).toBe(false);
	});
});

// ─── testPackage ──────────────────────────────────────────────────────────────

describe("testPackage", () => {
	const validQuestion = {
		...baseEntity,
		text: "Q1",
		type: "SINGLE" as const,
		authorId: "user-1",
		quiz: "quiz-1",
		answers: [{ text: "A", correct: true }],
		approved: true,
		editMode: false,
	};

	it("parses a valid test package", () => {
		const result = testPackage.parse({
			studentId: "s-1",
			quizId: "quiz-1",
			elements: [validQuestion],
		});
		expect(result.studentId).toBe("s-1");
		expect(result.elements).toHaveLength(1);
	});

	it("parses a test package with empty elements", () => {
		const result = testPackage.parse({
			studentId: "s-1",
			quizId: "quiz-1",
			elements: [],
		});
		expect(result.elements).toHaveLength(0);
	});

	it("rejects missing studentId", () => {
		expect(() =>
			testPackage.parse({ quizId: "quiz-1", elements: [] })
		).toThrow();
	});
});

// ─── examAnswer ───────────────────────────────────────────────────────────────

describe("examAnswer", () => {
	it("parses a string answer (text question)", () => {
		const result = examAnswer.parse({
			studentId: "s-1",
			quizId: "quiz-1",
			elementId: "q-1",
			answers: "my text answer",
		});
		expect(result.answers).toBe("my text answer");
	});

	it("parses an array-of-int answer (choice question)", () => {
		const result = examAnswer.parse({
			studentId: "s-1",
			quizId: "quiz-1",
			elementId: "q-1",
			answers: [0, 2],
		});
		expect(result.answers).toEqual([0, 2]);
	});

	it("rejects float indices in answers array", () => {
		expect(() =>
			examAnswer.parse({
				studentId: "s-1",
				quizId: "quiz-1",
				elementId: "q-1",
				answers: [0.5],
			})
		).toThrow();
	});

	it("rejects missing answers field", () => {
		expect(() =>
			examAnswer.parse({ studentId: "s-1", quizId: "quiz-1", elementId: "q-1" })
		).toThrow();
	});
});

// ─── examFeedback ─────────────────────────────────────────────────────────────

describe("examFeedback", () => {
	it("parses a PASSED feedback", () => {
		const result = examFeedback.parse({
			studentId: "s-1",
			quizId: "quiz-1",
			elementId: "q-1",
			result: "PASSED",
			answers: new Set([0, 1]),
			correct: new Set([0]),
		});
		expect(result.result).toBe("PASSED");
		expect(result.answers.has(0)).toBe(true);
		expect(result.correct.has(0)).toBe(true);
	});

	it("parses a FAILED feedback", () => {
		const result = examFeedback.parse({
			studentId: "s-1",
			quizId: "quiz-1",
			elementId: "q-1",
			result: "FAILED",
			answers: new Set([2]),
			correct: new Set([1]),
		});
		expect(result.result).toBe("FAILED");
	});

	it("rejects unknown result value", () => {
		expect(() =>
			examFeedback.parse({
				studentId: "s-1",
				quizId: "quiz-1",
				elementId: "q-1",
				result: "PARTIAL",
				answers: new Set([0]),
				correct: new Set([0]),
			})
		).toThrow();
	});

	it("rejects answers as plain array (must be a Set)", () => {
		expect(() =>
			examFeedback.parse({
				studentId: "s-1",
				quizId: "quiz-1",
				elementId: "q-1",
				result: "PASSED",
				answers: [0, 1],
				correct: new Set([0]),
			})
		).toThrow();
	});

	it("rejects float entries in answers set", () => {
		expect(() =>
			examFeedback.parse({
				studentId: "s-1",
				quizId: "quiz-1",
				elementId: "q-1",
				result: "PASSED",
				answers: new Set([0.5]),
				correct: new Set([0]),
			})
		).toThrow();
	});
});
