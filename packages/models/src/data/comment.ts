import zod from "zod";
import { idEntitySchema, uidSchema } from "./base";

export const commentSchema = zod
	.object({
		authorId: uidSchema, // WHo wrote this query
		authorName: zod.string(), // Which name to display with the query
		text: zod.string(), // Query text
		upvoters: zod.set(uidSchema), // Who upvoted the query
		answered: zod.boolean(), // Was the query marked as answered by the teacher
		relatedQuiz: uidSchema, // Relation to the quiz the comment was made on
		relatedQuestion: uidSchema.optional(), // Optional relation to question if comment was generated from there
	})
	.merge(idEntitySchema);

export type Comment = zod.infer<typeof commentSchema>;
