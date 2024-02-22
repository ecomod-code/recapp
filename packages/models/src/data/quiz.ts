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

export const quizElementSchema = zod
	.object({
		text: zod.string(), // Element text
		explanation: zod.string().optional(), // Optional explanatory text
		answers: zod.array(answerSchema), // Answers (empty for text question element)
		approved: zod.boolean(), // Whether the teacher has approved this question
		editMode: zod.boolean(), // Whether the question is currently edited by a teacher or its author
		statistics: zod.union([textElementStatisticsSchema, choiceElementStatisticsSchema]).optional(), // Last statistics for this question (if any)
	})
	.merge(idEntitySchema);

export type QuizElement = zod.infer<typeof quizElementSchema>;

export const elementGroupSchema = zod
	.object({
		name: zod.string(), // Group name/title
		elements: zod.array(quizElementSchema), // Which elements belong to this group
		statistics: groupStatisticsSchema.optional(), // Last statistics for this group (if any)
	})
	.merge(idEntitySchema);

export type ElementGroup = zod.infer<typeof elementGroupSchema>;

export const elementTypesSchema = zod.enum(["SINGLE", "MULTIPLE", "TEXT"]);

export type ElementType = zod.infer<typeof elementTypesSchema>;

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
		groups: zod.array(elementGroupSchema), // Groups belonging to this quiz
		studentQuestions: zod.boolean(), // Whether to allow students to create their own quiz elements
		studentParticipationSettings: zod.record<typeof userParticipationSchema, ZodBoolean>(
			userParticipationSchema,
			zod.boolean()
		), // How students can participate in this quiz (anonymous, with a nickname, with their real name)
		allowedQuestionTypesSettings: zod.record<typeof elementTypesSchema, ZodBoolean>(
			elementTypesSchema,
			zod.boolean()
		), // Which element types are allowed in this quiz
		studentParticipation: zod.record<typeof userParticipationSchema, ZodBoolean>(
			userParticipationSchema,
			zod.boolean()
		), // Which participation options are allowed after activating/running this quiz (overrides the settings above)
		allowedQuestionTypes: zod.record<typeof elementTypesSchema, ZodBoolean>(elementTypesSchema, zod.boolean()), // Which quiz elements are allowed after activating this quiz (overrides the settings above)
		shuffleQuestions: zod.boolean(), // Whether elements should be shuffled when running the quiz
		shared: zod.boolean(), // Whether the quiz was shared with other teachers
		activeComments: zod.boolean(), // Are student queries allowed after the quiz has been started
		statistics: groupStatisticsSchema.optional(), // Statistics for quiz, if any
		lastExport: timestampSchema.optional(), // Date of last export
	})
	.merge(idEntitySchema);

export type Quiz = zod.infer<typeof quizSchema>;

export const testPackage = zod.object({
	studentId: uidSchema,
	quizId: uidSchema,
	elements: zod.array(quizElementSchema),
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
