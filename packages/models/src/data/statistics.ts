import zod from "zod";
import { idEntitySchema, uidSchema } from "./base";


/**
 * Statistics for a free-text question.
 *
 * Captures how many students participated, how many skipped the question,
 * and all free-text answers that were given during a particular run.
 * The base entity fields (uid, created, updated, archived) are merged
 * via `idEntitySchema`.
 */
export const textElementStatisticsSchema = zod
	.object({
		tag: zod.enum(["TextElementStatistics"]),
		questionId: uidSchema,
		groupName: zod.string(),
		quizId: uidSchema,
		maximumParticipants: zod.number().int(), // Total participants of current run
		participants: zod.number().int(), // Number of participants who answered the question
		answers: zod.array(zod.string()), // All the given answers
		wrong: zod.number().int(), // How many people have skipped or not answered this question
	})
	.merge(idEntitySchema);

export type TextElementStatistics = zod.infer<typeof textElementStatisticsSchema>;

/**
 * Statistics for a single-choice or multiple-choice question.
 *
 * Tracks how many students answered, how many passed, and the number of
 * answers for each option, plus how many skipped the question. Base entity
 * fields are merged via `idEntitySchema`.
 */
export const choiceElementStatisticsSchema = zod
	.object({
		tag: zod.enum(["ChoiceElementStatistics"]),
		questionId: uidSchema,
		groupName: zod.string(),
		quizId: uidSchema,
		maximumParticipants: zod.number().int(), // Total participants of current run
		participants: zod.number().int(), // Number of participants who answered the question
		passed: zod.number().int(), // How many people answered the question correctly
		answers: zod.array(zod.number().int()), // Number of answers for each option
		wrong: zod.number().int(), // How many people have skipped or not answered this question
	})
	.merge(idEntitySchema);

export type ChoiceElementStatistics = zod.infer<typeof choiceElementStatisticsSchema>;

/**
 * Aggregated statistics for the whole quiz.
 *
 * Focuses on counts and correctness:
 * - total number of participants,
 * - answers and correct answers per question,
 * - how many answered incorrectly or skipped each question.
 */
export const groupStatisticsSchema = zod.object({
	groupName: zod.string(),
	quizId: uidSchema,
	maximumParticipants: zod.number().int(), // Total participants of current run
	answers: zod.array(zod.number().int()), // Number of answers to all the questions
	correctAnswers: zod.array(zod.number().int()), // Number correct answers to all the questions
	questionIds: zod.array(uidSchema),
	wrongAnswers: zod.array(zod.number().int()), // How many people have not correctly answered each question
});

export type GroupStatistics = zod.infer<typeof groupStatisticsSchema>;
