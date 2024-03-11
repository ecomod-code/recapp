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
export type Id = zod.infer<typeof uidSchema>;

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
