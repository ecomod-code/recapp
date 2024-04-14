import { unionize, ofType, UnionOf } from "unionize";
import { Id } from "../data/base";
import { ChoiceElementStatistics, TextElementStatistics } from "../data/statistics";

export type TextAnswer = {
	tag: "TextAnswer";
	questionId: Id;
	groupName: string;
	answer: string;
	maxParticipants: number;
};

export type ChoiceAnswer = {
	tag: "ChoiceAnswer";
	questionId: Id;
	groupName: string;
	choices: boolean[];
	correct: boolean;
	maxParticipants: number;
};

export const StatisticsActorMessages = unionize(
	{
		GetForQuestion: ofType<Id>(), // Get and optionally create the statistics for quiz
		GetForGroup: ofType<string>(), // Get and optionally create the statistics for quiz
		GetForQuiz: {},
		Update: ofType<TextAnswer | ChoiceAnswer>(), // Send the statistics for an answer to the current statistic
		Clear: {}, // Delete statistics for quiz
		SubscribeToCollection: {}, // Subscribe to all changes, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
		ExportQuizStats: {},
		ExportQuestionStats: {},
	},
	{ tag: "StatisticsActorMessages", value: "value" }
);

/** Message send to the client on quiz subscriptions */
export class StatisticsUpdateMessage {
	public readonly tag = "StatisticsUpdateMessage" as const;
	constructor(public readonly stats: Partial<TextElementStatistics | ChoiceElementStatistics>) {}
}

export class StatisticsDeletedMessage {
	public readonly tag = "StatisticsDeletedMessage" as const;
	constructor(public readonly quizId: Id) {}
}

export type StatisticsActorMessage = UnionOf<typeof StatisticsActorMessages>;
