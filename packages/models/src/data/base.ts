import { Timestamp } from "itu-utils";
import zod from "zod";
import { keys } from "rambda";

/**
 * Runtime schema for timestamps stored in the database.
 *
 * The underlying value is an integer (e.g. Unix time in milliseconds)
 * with a `type` tag `"Timestamp"`. The schema transforms this raw object
 * into an instance of `Timestamp` from `itu-utils`, so the rest of the
 * code can work with a richer timestamp type instead of plain numbers.
 */
export const timestampSchema = zod
	.object({
		value: zod.number().int(),
		type: zod.enum(["Timestamp"]),
	})
	.transform(value => new Timestamp(value.value));


/**
 * Zod schema for unique identifiers (UIDs).
 *
 * At runtime this is just a string, but the schema adds a `"UID"` brand
 * so that the resulting type can be distinguished from plain strings.
 */
export const uidSchema = zod.string().brand("UID");

/**
 * A unique identifier for entities stored in Recapp.
 *
 * This is a branded string type: at runtime it's a string,
 * but the TypeScript type system treats it as distinct from plain strings.
 */
export type Id = zod.infer<typeof uidSchema>;

/**
 * Convert a plain string (e.g. from user input or the database) into an `Id`.
 *
 * Note: This does *not* validate the string contents, it only adds the `Id`
 * brand. Use `uidSchema.parse(...)` if you need runtime validation.
 */
export const toId = (idString: string): Id => idString as Id;

/**
 * Zod schema for actor or actor-system URIs.
 *
 * These URIs identify actors in the backend actor system (and corresponding
 * frontend actors that talk to them). Again, this is a branded string type
 * to prevent accidentally mixing it with other string values.
 */
export const actorUriSchema = zod.string().brand("ActorUri");

/**
 * URI of an actor or actor system.
 *
 * Branded string type used to reference actors in the backend or frontend.
 */
export type ActorUri = zod.infer<typeof actorUriSchema>;

/**
 * Convert a plain string into an `ActorUri`.
 *
 * Like `toId`, this performs only a type cast / branding and no validation.
 */
export const toActorUri = (uriString: string): ActorUri => uriString as ActorUri;

/**
 * Base schema for entities stored in the database.
 *
 * All persistent entities (Quiz, User, Comment, …) typically merge this
 * schema via `.merge(idEntitySchema)` to add:
 * - `uid`: global unique identifier for the entity,
 * - `created`: timestamp when the entity was created,
 * - `updated`: timestamp of the last modification,
 * - `archived`: optional timestamp set when an entity is archived
 *   (i.e. treated as “soft-deleted”).
 */
export const idEntitySchema = zod.object({
	uid: uidSchema,
	created: timestampSchema,
	updated: timestampSchema,
	archived: timestampSchema.optional(), // Only set if the the entity was archived ("deleted")
});

/**
 * Generic validation result type.
 *
 * For a given data shape `T`, a `Validator<T>` stores a boolean flag
 * for each property of `T`. This is used on the frontend to track which
 * fields of a form are currently valid/invalid.
 */
export type Validator<T> = {
	[Property in keyof T]: boolean;
};

/**
 * Check whether all properties in a validation result are `true`.
 *
 * Returns `true` if *every* field of the given `validation` object
 * is truthy, otherwise `false`.
 *
 * Example:
 * ```ts
 * const v: Validator<{ title: string; description: string }> = {
 *   title: true,
 *   description: false,
 * };
 * validationOkay(v); // => false
 * ```
 */
export const validationOkay = <T>(validation: Validator<T>): boolean => {
	const validationKeys = keys(validation);
	for (const k of validationKeys) {
		if (!validation[k]) return false;
	}
	return true;
};
