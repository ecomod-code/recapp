import zod from "zod";
import { idEntitySchema, uidSchema } from "./base";


/**
 * Schema and type for comments attached to a quiz or a specific question.
 *
 * A comment is typically created by a student during a quiz run. It is
 * associated with:
 * - the author (`authorId`, `authorName`),
 * - a quiz (`relatedQuiz`),
 * - optionally a single question (`relatedQuestion`).
 *
 * Comments can be upvoted by other students and marked as answered by
 * the teacher. Common entity fields like `uid`, `created`, and `updated`
 * are merged in via `idEntitySchema`.
 */
export const commentSchema = zod
	.object({
		authorId: uidSchema, // Who wrote this query
		authorName: zod.string(), // Name to display with the comment
		text: zod.string(), // Comment text
		upvoters: zod.array(uidSchema), // Users who upvoted the comment
		answered: zod.boolean(), // Was the comment marked as answered by the teacher (quiz owner)
		relatedQuiz: uidSchema, // Quiz the comment was made on
		relatedQuestion: uidSchema.optional(), // Optional question the comment refers to
	})
	.merge(idEntitySchema);

/** Type alias for comments, inferred from `commentSchema`. */
export type Comment = zod.infer<typeof commentSchema>;
