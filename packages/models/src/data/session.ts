import zod from "zod";
import { timestampSchema, uidSchema } from "./base";
import { userRoleSchema } from "./user";

export const sessionSchema = zod.object({
	idToken: zod.string(),
	accessToken: zod.string(),
	refreshToken: zod.string(),
	uid: uidSchema,
	expires: timestampSchema,
	actorSystem: zod.string(),
	role: userRoleSchema,
	created: timestampSchema,
	updated: timestampSchema,
});

export type Session = zod.infer<typeof sessionSchema>;
