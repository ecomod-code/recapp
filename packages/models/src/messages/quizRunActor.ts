import { unionize, ofType, UnionOf } from "unionize";
import { QuizRun } from "../data/quiz";
import { Id } from "../data/base";

export const QuizRunActorMessages = unionize(
	{
		Update: ofType<Partial<QuizRun> & { uid: Id }>(), // Update comment data, answers updated Comment
		GetForUser: ofType<{ studentId: Id; questions: Id[] }>(), // Return a run for the given user id. Will be created if it doesn't exist yet
		Clear: {},
		SubscribeToCollection: {}, // Subscribe to all changes, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
	},
	{ tag: "QuizRunActorMessage", value: "value" }
);

/** Message send to the client on quiz subscriptions */
export class QuizRunUpdateMessage {
	public readonly tag = "QuizRunUpdateMessage" as const;
	constructor(public readonly run: Partial<QuizRun>) {}
}

export class QuizRunDeletedMessage {
	public readonly tag = "QuizRunDeletedMessage" as const;
}

export type QuizRunActorMessage = UnionOf<typeof QuizRunActorMessages>;
