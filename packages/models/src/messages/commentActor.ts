import { unionize, ofType, UnionOf } from "unionize";
import { Comment } from "../data/comment";
import { Id } from "../data/base";

/**
 * Messages handled by the backend actor responsible for comments.
 *
 * The `CommentActor` manages creation, updates, upvotes and deletion
 * of comments, as well as subscriptions for live updates of the comment
 * collection.
 */
export const CommentActorMessages = unionize(
	{
		/**
		 * Create a new comment.
		 *
		 * Payload is a `Comment` without the generated `uid` field.
		 * The actor stores the comment and responds with the created
		 * comment including its `uid`.
		 */
		Create: ofType<Omit<Comment, "uid">>(),

		/**
		 * Update an existing comment.
		 *
		 * Payload contains the `uid` of the comment to update plus a
		 * partial set of fields to change. The actor applies the patch
		 * and typically responds with the updated comment.
		 */
		Update: ofType<Partial<Comment> & { uid: Id }>(),

		/**
		 * Upvote a comment on behalf of a user.
		 *
		 * Payload contains the comment id and the user id. The actor
		 * adds or toggles the user in the comment's `upvoters` list.
		 */
		Upvote: ofType<{ commentId: Id; userId: Id }>(),

		/**
		 * Delete a comment by id.
		 *
		 * Payload is the `Id` of the comment to delete.
		 */
		Delete: ofType<Id>(),

		/**
		 * Request all comments that are visible to the caller.
		 *
		 * The actor responds with the list of `Comment` entities.
		 */
		GetAll: {}, 

		/**
		 * Subscribe to comment collection changes.
		 *
		 * After subscribing, the caller receives update/delete messages
		 * whenever comments in the collection change.
		 */
		SubscribeToCollection: {},

		/**
		 * Unsubscribe from comment collection changes.
		 */
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
	},
	{ tag: "CommentActorMessage", value: "value" }
);

/**
 * Message sent to the client when a comment is created or updated.
 *
 * Carries a partial `Comment` object; at minimum the `uid` is present,
 * plus any fields that changed.
 */
export class CommentUpdateMessage {
	public readonly tag = "CommentUpdateMessage" as const;
	constructor(public readonly comment: Partial<Comment>) {}
}

/**
 * Message sent to the client when a comment was deleted.
 *
 * Contains only the `id` of the deleted comment.
 */
export class CommentDeletedMessage {
	public readonly tag = "CommentDeletedMessage" as const;
	constructor(public readonly id: Id) {}
}

/**
 * Union type of all messages accepted by the `CommentActor`.
 */
export type CommentActorMessage = UnionOf<typeof CommentActorMessages>;
