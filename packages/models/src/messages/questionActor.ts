import { unionize, ofType, UnionOf } from "unionize";
import { Question } from "../data/quiz";
import { Id } from "../data/base";

export const QuestionActorMessages = unionize(
	{
		Create: ofType<Omit<Question, "uid" | "created" | "updated">>(), // Create a new question
		Update: ofType<Partial<Question> & { uid: Id }>(),              // Update question data
		GetAll: {},                                                      // Send all questions of this quiz to requester
		Delete: ofType<Id>(),                                            // Delete question
		SubscribeToCollection: {}, // Subscribe to all changes, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
	},
	{ tag: "QuestionActorMessage", value: "value" }
);

/** Message send to the client on quiz subscriptions */
export class QuestionUpdateMessage {
	public readonly tag = "QuestionUpdateMessage" as const;
	constructor(public readonly question: Partial<Question>) { }
}

export class QuestionDeletedMessage {
	public readonly tag = "QuestionDeletedMessage" as const;
	constructor(public readonly id: Id) { }
}

export type QuestionActorMessage = UnionOf<typeof QuestionActorMessages>;
