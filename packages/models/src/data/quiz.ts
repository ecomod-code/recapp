import zod, { ZodBoolean } from "zod";
import { idEntitySchema, timestampSchema, uidSchema } from "./base";
import { userParticipationSchema } from "./user";
import { textElementStatisticsSchema, choiceElementStatisticsSchema, groupStatisticsSchema } from "./statistics";

export const answerSchema = zod.object({
	text: zod.string(), // Text of answer option
	correct: zod.boolean(), // Whether this is an correct answer
});

export type Answer = zod.infer<typeof answerSchema>;

export const questionTypesSchema = zod.enum(["SINGLE", "MULTIPLE", "TEXT"]);

export type QuestionTypes = zod.infer<typeof questionTypesSchema>;

export const questionSchema = zod
	.object({
		text: zod.string(), // Question text
		type: questionTypesSchema,
		authorId: uidSchema, // Author id
		authorName: zod.string().optional(), // Display name of the author (may also be a nickname or ANONYMOUS)
		quiz: uidSchema, // Quiz the question belongs
		hint: zod.string().optional(), // Optional explanatory text/hint
		answers: zod.array(answerSchema), // Answers (empty for text question element)
		approved: zod.boolean(), // Whether the teacher has approved this question
		editMode: zod.boolean(), // Whether the question is currently edited by a teacher or its author
		statistics: zod.union([textElementStatisticsSchema, choiceElementStatisticsSchema]).optional(), // Last statistics for this question (if any)
	})
	.merge(idEntitySchema);

export type Question = zod.infer<typeof questionSchema>;

export const questionGroupSchema = zod.object({
	name: zod.string(), // Group name/title
	questions: zod.array(uidSchema), // Which elements belong to this group
	statistics: groupStatisticsSchema.optional(), // Last statistics for this group (if any)
});

export type QuestionGroup = zod.infer<typeof questionGroupSchema>;

export type QuestionType = zod.infer<typeof questionTypesSchema>;

export const runOptionsSchema = zod.object({
	runningEntity: uidSchema.optional(), // Which question/group should be run when the quiz is started? If empty, run whole quiz
});

/** A RUN is a quiz run for a single student. It holds the individual student's question order and his answers */
export const quizRunSchema = zod
	.object({
		studentId: uidSchema, // Which student's run is this
		quizId: uidSchema, // To which quiz does it belong
		questions: zod.array(uidSchema), // Order of questions to ask
		counter: zod.number().int(), // Current question that was not answered yet
		answers: zod.array(zod.union([zod.string(), zod.array(zod.boolean().nullish())])), // The answers the student has given
		correct: zod.array(zod.boolean()), // Logs whether the answers were correct or not
	})
	.merge(idEntitySchema);

export type QuizRun = zod.infer<typeof quizRunSchema>;

export const quizSchema = zod
	.object({
		title: zod.string(), // Quiz title
		description: zod.string(), // Description of quiz
		state: zod.enum(["EDITING", "ACTIVE", "STARTED", "STOPPED"]), // State machine state (only teachers edit, teachers and students create questions and comments, quiz mode, read-only-mode)
		uniqueLink: zod.string(), // Unique link for this quiz
		runOptions: runOptionsSchema.optional(), // If running, the current run options are given here
		groups: zod.array(questionGroupSchema), // Groups belonging to this quiz
		comments: zod.array(uidSchema),
		studentQuestions: zod.boolean(), // Whether to allow students to create their own quiz elements
		studentComments: zod.boolean(), // ARe student comments allowed after the quiz has been started
		studentParticipationSettings: zod.record<typeof userParticipationSchema, ZodBoolean>(
			userParticipationSchema,
			zod.boolean()
		), // How students can participate in this quiz (anonymous, with a nickname, with their real name)
		allowedQuestionTypesSettings: zod.record<typeof questionTypesSchema, ZodBoolean>(
			questionTypesSchema,
			zod.boolean()
		), // Which element types are allowed in this quiz
		shuffleQuestions: zod.boolean(), // Whether elements should be shuffled when running the quiz
		statistics: groupStatisticsSchema.optional(), // Statistics for quiz, if any
		lastExport: timestampSchema.optional(), // Date of last export
		teachers: zod.array(uidSchema), // Teachers who can access and change the quiz
		students: zod.array(uidSchema), // Students participating in this quiz
		hideComments: zod.boolean().optional().default(false), // Hide the comments from all student participants. For teachers, they will stay visible, but only in edit mode.
	})
	.merge(idEntitySchema);

export type Quiz = zod.infer<typeof quizSchema>;

export const testPackage = zod.object({
	studentId: uidSchema,
	quizId: uidSchema,
	elements: zod.array(questionSchema),
});

export const examAnswer = zod.object({
	studentId: uidSchema,
	quizId: uidSchema,
	elementId: uidSchema,
	answers: zod.union([zod.string(), zod.array(zod.number().int())]),
});

export const examFeedback = zod.object({
	studentId: uidSchema,
	quizId: uidSchema,
	elementId: uidSchema,
	result: zod.enum(["PASSED", "FAILED"]),
	answers: zod.set(zod.number().int()),
	correct: zod.set(zod.number().int()),
});
