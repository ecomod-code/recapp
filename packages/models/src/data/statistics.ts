import zod from "zod";

export const textElementStatisticsSchema = zod.object({
	maximumParticipants: zod.number().int(), // Total participants of current run
	participants: zod.number().int(), // Number of participants who answered the question
	answers: zod.map(zod.string(), zod.number().int()), // All Answers of those participants
});

export type TextElementStatistics = zod.infer<typeof textElementStatisticsSchema>;

export const choiceElementStatisticsSchema = zod.object({
	maximumParticipants: zod.number().int(), // Total participants of current run
	participants: zod.number().int(), // Number of participants who answered the question
	answers: zod.map(zod.number().int(), zod.number().int()), // Number of answers for each option
	correct: zod.set(zod.number().int()), // Which answers are correct
	passed: zod.number().int(), // How many people answered the question correctly
});

export type ChoiceElementStatistics = zod.infer<typeof choiceElementStatisticsSchema>;

export const groupStatisticsSchema = zod.object({
	questionNames: zod.array(zod.string()), // Names of all questions in group or quiz
	maximumParticipants: zod.number().int(), // Total participants of current run
	answers: zod.array(zod.number().int()), // Number of answers to all the questions
	correctAnswers: zod.array(zod.number().int()), // Number correct answers to all the questions
});

export type GroupStatistics = zod.infer<typeof groupStatisticsSchema>;
