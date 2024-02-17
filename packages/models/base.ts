import zod from "zod";

export const timestampSchema = zod.number().int();

export const uidSchema = zod.string();

export const idSchema = zod.object({
	uid: uidSchema,
	created: timestampSchema,
	updated: timestampSchema,
	archived: timestampSchema.optional(), // Only set if the the entity was archived ("deleted")
});
