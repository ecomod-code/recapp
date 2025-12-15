import { Timestamp } from "itu-utils";
import zod from "zod";
import { keys } from "rambda";

export const timestampSchema = zod
	.object({
		value: zod.number().int(),
		type: zod.enum(["Timestamp"]),
	})
	.transform(value => new Timestamp(value.value));

/** UID type */
export const uidSchema = zod.string().brand("UID");

/**
 * A unique identifier for entities stored in Recapp.
 *
 * This is a branded string type: at runtime it's a string,
 * but the TypeScript type system treats it as distinct from plain strings.
 */
export type Id = zod.infer<typeof uidSchema>;

/**
 * Convert a plain string (e.g. from user input or DB) into an `Id`.
 *
 * Note: This does not validate the string, it only adds the `Id` type brand.
 * Use `uidSchema.parse(...)` if you want runtime validation.
 */
export const toId = (idString: string): Id => idString as Id;

/** Actor or actor system uri */
export const actorUriSchema = zod.string().brand("ActorUri");
export type ActorUri = zod.infer<typeof actorUriSchema>;

export const toActorUri = (uriString: string): ActorUri => uriString as ActorUri;

export const idEntitySchema = zod.object({
	uid: uidSchema,
	created: timestampSchema,
	updated: timestampSchema,
	archived: timestampSchema.optional(), // Only set if the the entity was archived ("deleted")
});

export type Validator<T> = {
	[Property in keyof T]: boolean;
};

export const validationOkay = <T>(validation: Validator<T>): boolean => {
	const validationKeys = keys(validation);
	for (const k of validationKeys) {
		if (!validation[k]) return false;
	}
	return true;
};
