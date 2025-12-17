import { unionize, ofType, UnionOf } from "unionize";
import { Question } from "../data/quiz";
import { Id } from "../data/base";

/**
 * Messages handled by the backend actor responsible for questions.
 *
 * The `QuestionActor` manages creation, updates and deletion of quiz
 * questions and exposes collection subscriptions so clients can react
 * to changes in real time.
 */
export const QuestionActorMessages = unionize(
	{
		/**
		 * Create a new question.
		 *
		 * Payload is a `Question` without the generated fields `uid`,
		 * `created` and `updated`. The actor stores the question and
		 * responds with the created entity including these fields.
		 */
		Create: ofType<Omit<Question, "uid" | "created" | "updated">>(),

		/**
		 * Update an existing question.
		 *
		 * Payload contains the `uid` of the question to update plus a
		 * partial set of fields to change. The actor applies the patch
		 * and typically responds with the updated question.
		 */
		Update: ofType<Partial<Question> & { uid: Id }>(), 

		/**
		 * Remove the "edit" flag from all questions.
		 *
		 * Used to clear stalled edit modes when a user leaves the editor
		 * without properly finishing editing.
		 */
		Unstall: {}, 

		/**
		 * Request all questions that are visible to the caller.
		 *
		 * The actor responds with a list of `Question` entities for
		 * the relevant quiz.
		 */
		GetAll: {},

		/**
		 * Delete a question by id.
		 */
		Delete: ofType<Id>(),

		/**
		 * Subscribe to question collection changes.
		 *
		 * After subscribing, the caller receives `QuestionUpdateMessage`
		 * and `QuestionDeletedMessage` events whenever questions change.
		 */
		SubscribeToCollection: {},

		/**
		 * Unsubscribe from question collection changes.
		 */
		UnsubscribeFromCollection: {},
	},
	{ tag: "QuestionActorMessage", value: "value" }
);

/**
 * Message sent to the client when a question is created or updated.
 *
 * Carries a partial `Question` object; at minimum the `uid` is present,
 * plus any fields that changed.
 */
export class QuestionUpdateMessage {
	public readonly tag = "QuestionUpdateMessage" as const;
	constructor(public readonly question: Partial<Question>) {}
}

/**
 * Message sent to the client when a question was deleted.
 */
export class QuestionDeletedMessage {
	public readonly tag = "QuestionDeletedMessage" as const;
	constructor(public readonly id: Id) {}
}

/**
 * Union type of all messages accepted by the `QuestionActor`.
 */
export type QuestionActorMessage = UnionOf<typeof QuestionActorMessages>;
