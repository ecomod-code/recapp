import { unionize, ofType, UnionOf } from "unionize";
import { Question } from "../data/quiz";
import { Id } from "../data/base";

export const QuestionActorMessages = unionize(
	{
		Create: ofType<Omit<Question, "uid" | "created" | "updated">>(), // Create a new comment, returns the comment uid
		Update: ofType<Partial<Question> & { uid: Id }>(), // Update comment data, answers updated Comment
		Unstall: {}, // Remove the edit flag on all questions
		GetAll: {}, // Get all quizzes accessible by the requester, will send back all comments in this list to the requester
		Delete: ofType<Id>(),
		SubscribeToCollection: {}, // Subscribe to all changes, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
	},
	{ tag: "QuestionActorMessage", value: "value" }
);

/** Message send to the client on quiz subscriptions */
export class QuestionUpdateMessage {
	public readonly tag = "QuestionUpdateMessage" as const;
	constructor(public readonly question: Partial<Question>) {}
}

export class QuestionDeletedMessage {
	public readonly tag = "QuestionDeletedMessage" as const;
	constructor(public readonly id: Id) {}
}

export type QuestionActorMessage = UnionOf<typeof QuestionActorMessages>;
