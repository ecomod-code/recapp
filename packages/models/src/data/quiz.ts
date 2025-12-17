import zod, { ZodBoolean } from "zod";
import { Id, idEntitySchema, timestampSchema, uidSchema } from "./base";
import { userParticipationSchema } from "./user";
import { textElementStatisticsSchema, choiceElementStatisticsSchema, groupStatisticsSchema } from "./statistics";

/**
 * Schema and type for answer options in a quiz question.
 *
 * Each answer has:
 * - `text`: the label shown to students,
 * - `correct`: whether this option counts as correct for grading.
 *
 * For text questions, the `answers` array is usually empty and grading
 * is handled differently.
 */
export const answerSchema = zod.object({
	text: zod.string(), // Text of answer option
	correct: zod.boolean(), // Whether this is an correct answer
});

export type Answer = zod.infer<typeof answerSchema>;

/**
 * Enumeration of supported question types.
 *
 * - `"SINGLE"`: single-choice (exactly one option is correct)
 * - `"MULTIPLE"`: multiple-choice (several options may be correct)
 * - `"TEXT"`: free-text answer (no predefined answer options)
 */
export const questionTypesSchema = zod.enum(["SINGLE", "MULTIPLE", "TEXT"]);

export type QuestionTypes = zod.infer<typeof questionTypesSchema>;

/**
 * Schema and type for individual quiz questions.
 *
 * A question belongs to exactly one quiz and may be of type SINGLE,
 * MULTIPLE, or TEXT. For choice-based questions, `answers` contains
 * the available options; for text questions, `answers` is typically empty.
 *
 * Teachers can approve questions and see element-level statistics.
 * Base entity fields (uid, created, updated, archived) are merged
 * via `idEntitySchema`.
 */
export const questionSchema = zod
	.object({
		text: zod.string(), // Question text
		type: questionTypesSchema,
		authorId: uidSchema, // Author id
		authorFingerprint: zod.string().optional(), // Author id
		authorName: zod.string().optional(), // Display name of the author (may also be a nickname or ANONYMOUS)
		quiz: uidSchema, // Quiz the question belongs
		hint: zod.string().optional(), // Optional explanatory text/hint
		answers: zod.array(answerSchema), // Answers (empty for text question element)
		approved: zod.boolean(), // Whether the teacher has approved this question
		editMode: zod.boolean(), // Whether the question is currently edited by a teacher or its author
		statistics: zod.union([textElementStatisticsSchema, choiceElementStatisticsSchema]).optional(), // Last statistics for this question (if any)
		answerOrderFixed: zod.boolean().optional().default(false), // Whether the order of the answers is fixed
	})
	.merge(idEntitySchema);

export type Question = zod.infer<typeof questionSchema>;

/** Group of questions used to structure larger quizzes and statistics. */
export const questionGroupSchema = zod.object({
	name: zod.string(), // Group name/title
	questions: zod.array(uidSchema), // Which elements belong to this group
	statistics: groupStatisticsSchema.optional(), // Last statistics for this group (if any)
});

export type QuestionGroup = zod.infer<typeof questionGroupSchema>;

export type QuestionType = zod.infer<typeof questionTypesSchema>;

/**
 * Additional configuration used when running a quiz.
 *
 * If `runningEntity` is set, only a specific question or group is run
 * (e.g. “just this question group now”). If omitted, the whole quiz is
 * run according to its default settings.
 */
export const runOptionsSchema = zod.object({
	runningEntity: uidSchema.optional(), // Which question/group should be run when the quiz is started? If empty, run whole quiz
});

/**
 * Schema and type for a quiz run of a single student.
 *
 * A `QuizRun` tracks:
 * - which student is participating,
 * - which quiz is being answered,
 * - the individualized question order,
 * - the student's answers, and
 * - per-question correctness flags.
 *
 * Base entity fields are merged via `idEntitySchema`.
 */export const quizRunSchema = zod
	.object({
		studentId: uidSchema, // Which student's run this is
		quizId: uidSchema, // Quiz this run belongs to	
		questions: zod.array(uidSchema), // Order of questions to ask
		counter: zod.number().int(), // Index of the next unanswered question
		answers: zod.array(zod.union([zod.string(), zod.array(zod.boolean().nullish())])), // Student answers; structure depends on question type
		correct: zod.array(zod.boolean()), // Whether given answers were correct
		wrong: zod.array(zod.boolean()), // Whether given answers were wrong
	})
	.merge(idEntitySchema);

export type QuizRun = zod.infer<typeof quizRunSchema>;

/**
 * Schema and type for quizzes.
 *
 * A quiz is the central unit used in teaching sessions. It aggregates:
 * - metadata (title, description, state),
 * - structure (`groups` of questions),
 * - settings (participation, allowed question types, shuffling),
 * - access control (teachers, previewers, students),
 * - runtime state (run options, statistics, last export).
 *
 * Base entity fields are merged via `idEntitySchema`.
 */
export const quizSchema = zod
	.object({
		title: zod.string(), // Quiz title
		description: zod.string(), // Description of the quiz
		state: zod.enum(["EDITING", "ACTIVE", "STARTED", "STOPPED"]), // Lifecycle state of the quiz
		// (your other fields here, unchanged – uniqueLink, runOptions, groups, comments, etc.)
		uniqueLink: zod.string(), // Unique link for this quiz
		runOptions: runOptionsSchema.optional(), // Current run options, if the quiz is running
		groups: zod.array(questionGroupSchema), // Groups belonging to this quiz
		comments: zod.array(uidSchema), // Comments associated with this quiz
		studentQuestions: zod.boolean(), // Whether students may create their own questions
		studentComments: zod.boolean(), // Whether student comments are allowed in quiz mode
		studentParticipationSettings: zod.record<typeof userParticipationSchema, ZodBoolean>(
			userParticipationSchema,
			zod.boolean()
		), // How students can participate (anonymous, nickname, real name)
		allowedQuestionTypesSettings: zod.record<typeof questionTypesSchema, ZodBoolean>(
			questionTypesSchema,
			zod.boolean()
		), // Which question types are allowed in this quiz
		shuffleQuestions: zod.boolean(), // Whether questions should be shuffled for students
		shuffleAnswers: zod.boolean().optional().default(false), // Whether answers should be shuffled
		studentsCanSeeStatistics: zod.boolean().optional(), // Whether students can see statistics after answering
		statistics: groupStatisticsSchema.optional(), // Aggregated statistics for the quiz, if any
		lastExport: timestampSchema.optional(), // Date of last export
		createdBy: uidSchema.optional(), // Original creator of the quiz
		teachers: zod.array(uidSchema), // Teachers who can access and change the quiz
		previewers: zod.array(uidSchema).optional(), // Teachers previewing the quiz as students
		students: zod.array(uidSchema), // Students participating in this quiz
		hideComments: zod
			.boolean()
			.optional()
			.default(false), // Hide student comments for students; teachers still see them in edit mode
	})
	.merge(idEntitySchema);

export type Quiz = zod.infer<typeof quizSchema>;

/**
 * Check whether a user is a teacher for the given quiz (but not just a previewer).
 *
 * Teachers in the `previewers` list are treated as students for access
 * control in some contexts, so they are excluded here.
 */
export const isInTeachersList = (quiz: Quiz, userId: Id): boolean =>
	quiz.teachers.includes(userId) && !(quiz.previewers ?? []).includes(userId);

/**
 * Check whether a user participates in a quiz as a student.
 *
 * A user counts as a student if they are either explicitly listed in
 * `students` or are in the `previewers` list (teachers previewing as
 * students).
 */
export const isInStudentList = (quiz: Quiz, userId: Id): boolean =>
	quiz.students.includes(userId) || (quiz.previewers ?? []).includes(userId);

// /**
//  * Package of questions used for an exam-like run.
//  *
//  * Contains:
//  * - the student and quiz ids,
//  * - the concrete question elements that form the test.
//  */
// export const testPackage = zod.object({
// 	studentId: uidSchema,
// 	quizId: uidSchema,
// 	elements: zod.array(questionSchema),
// });

// /**
//  * Answers submitted by a student in an exam context.
//  *
//  * Depending on the question type, `answers` may be:
//  * - a string (e.g. for free-text),
//  * - an array of indices referring to selected choices.
//  */
// export const examAnswer = zod.object({
// 	studentId: uidSchema,
// 	quizId: uidSchema,
// 	elementId: uidSchema,
// 	answers: zod.union([zod.string(), zod.array(zod.number().int())]),
// });

// /**
//  * Feedback returned after evaluating an exam answer.
//  *
//  * Contains:
//  * - the pass/fail result for this element,
//  * - the set of selected answer indices,
//  * - and the set of correct answer indices.
//  */
// export const examFeedback = zod.object({
// 	studentId: uidSchema,
// 	quizId: uidSchema,
// 	elementId: uidSchema,
// 	result: zod.enum(["PASSED", "FAILED"]),
// 	answers: zod.set(zod.number().int()),
// 	correct: zod.set(zod.number().int()),
// });
