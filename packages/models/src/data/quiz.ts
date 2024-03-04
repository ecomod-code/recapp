import zod, { ZodBoolean } from "zod";
import { idEntitySchema, timestampSchema, uidSchema } from "./base";
import { userParticipationSchema } from "./user";
import { textElementStatisticsSchema, choiceElementStatisticsSchema, groupStatisticsSchema } from "./statistics";

export const answerSchema = zod
	.object({
		text: zod.string(), // Text of answer option
		correct: zod.boolean(), // Whether this is an correct answer
	})
	.merge(idEntitySchema);

export type Answer = zod.infer<typeof answerSchema>;

export const questionSchema = zod
	.object({
		text: zod.string(), // Element text
		authorId: uidSchema,
		authorName: zod.string().optional(),
		quiz: uidSchema,
		explanation: zod.string().optional(), // Optional explanatory text
		answers: zod.array(answerSchema), // Answers (empty for text question element)
		approved: zod.boolean(), // Whether the teacher has approved this question
		editMode: zod.boolean(), // Whether the question is currently edited by a teacher or its author
		statistics: zod.union([textElementStatisticsSchema, choiceElementStatisticsSchema]).optional(), // Last statistics for this question (if any)
	})
	.merge(idEntitySchema);

export type Question = zod.infer<typeof questionSchema>;

export const questionGroupSchema = zod.object({
	name: zod.string(), // Group name/title
	questions: zod.array(questionSchema), // Which elements belong to this group
	statistics: groupStatisticsSchema.optional(), // Last statistics for this group (if any)
});

export type QuestionGroup = zod.infer<typeof questionGroupSchema>;

export const questionTypesSchema = zod.enum(["SINGLE", "MULTIPLE", "TEXT"]);

export type QuestionType = zod.infer<typeof questionTypesSchema>;

export const runOptionsSchema = zod.object({
	runningEntity: uidSchema.optional(), // Which question/group should be run when the quiz is started? If empty, run whole quiz
});

export const quizSchema = zod
	.object({
		title: zod.string(), // Quiz title
		description: zod.string(), // Description of quiz
		state: zod.enum(["EDITING", "ACTIVE", "STARTED", "STOPPED"]), // State machine state
		uniqueLink: zod.string(), // Unique link for this quiz
		runOptions: runOptionsSchema.optional(), // If running, the current run options are given here
		groups: zod.array(questionGroupSchema), // Groups belonging to this quiz
		studentQuestions: zod.boolean(), // Whether to allow students to create their own quiz elements
		studentParticipationSettings: zod.record<typeof userParticipationSchema, ZodBoolean>(
			userParticipationSchema,
			zod.boolean()
		), // How students can participate in this quiz (anonymous, with a nickname, with their real name)
		allowedQuestionTypesSettings: zod.record<typeof questionTypesSchema, ZodBoolean>(
			questionTypesSchema,
			zod.boolean()
		), // Which element types are allowed in this quiz
		studentParticipation: zod.record<typeof userParticipationSchema, ZodBoolean>(
			userParticipationSchema,
			zod.boolean()
		), // Which participation options are allowed after activating/running this quiz (overrides the settings above)
		allowedQuestionTypes: zod.record<typeof questionTypesSchema, ZodBoolean>(questionTypesSchema, zod.boolean()), // Which quiz elements are allowed after activating this quiz (overrides the settings above)
		shuffleQuestions: zod.boolean(), // Whether elements should be shuffled when running the quiz
		activeComments: zod.boolean(), // Are student queries allowed after the quiz has been started
		statistics: groupStatisticsSchema.optional(), // Statistics for quiz, if any
		lastExport: timestampSchema.optional(), // Date of last export
		teachers: zod.array(uidSchema),
		students: zod.array(uidSchema),
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
