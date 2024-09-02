import zod from "zod";
import { idEntitySchema, uidSchema } from "./base";

// Statistics for a free text answer

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

// Statistics for a single- or multiple-choice answers

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

// Statistics for a group of the whole quiz. We are only interested in the number and correctness of answers

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
