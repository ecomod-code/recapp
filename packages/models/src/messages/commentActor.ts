import { unionize, ofType, UnionOf } from "unionize";
import { Comment } from "../data/comment";
import { Id } from "../data/base";

export const CommentActorMessages = unionize(
	{
		Create: ofType<Comment>(), // Create a new quiz
		Update: ofType<Partial<Comment> & { uid: Id }>(), // Update quiz data, answers updated Quiz
		GetAll: {}, // Get all quizzes accessible by the requester, will send back all quizzes in this list to the requester
		SubscribeToCollection: {}, // Subscribe to all changes, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
	},
	{ tag: "CommentActorMessage", value: "value" }
);

/** Message send to the client on quiz subscriptions */
export class CommentUpdateMessage {
	public readonly type = "CommentUpdateMessage" as const;
	constructor(public readonly user: Partial<Comment>) {}
}

export type CommentActorMessage = UnionOf<typeof CommentActorMessages>;
