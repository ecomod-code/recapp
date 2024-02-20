import zod from "zod";

export const timestampSchema = zod.object({
	value: zod.number().int(),
	type: zod.enum(["Timestamp"]),
});

/** UID type */
export declare const uidSchema: zod.ZodBranded<zod.ZodString, "Id">;
export type Id = zod.infer<typeof uidSchema>;

/** Actor or actor system uri */
export declare const actorUriSchema: zod.ZodBranded<zod.ZodString, "ActorUri">;
export type ActorUri = zod.infer<typeof actorUriSchema>;

export const idEntitySchema = zod.object({
	uid: uidSchema,
	created: timestampSchema,
	updated: timestampSchema,
	archived: timestampSchema.optional(), // Only set if the the entity was archived ("deleted")
});
