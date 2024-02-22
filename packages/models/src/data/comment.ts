import zod from "zod";
import { idEntitySchema, uidSchema } from "./base";

export const commentSchema = zod
	.object({
		authorId: uidSchema, // WHo wrote this query
		authorName: zod.string(), // Which name to display with the query
		text: zod.string(), // Query test
		upvoters: zod.set(uidSchema), // Who upvoted the query
		answered: zod.boolean(), // Was the query marked as answered by the teacher
		relatedQuestion: uidSchema, // Optional relation to question if comment was generated from there
	})
	.merge(idEntitySchema);

export type Comment = zod.infer<typeof commentSchema>;
