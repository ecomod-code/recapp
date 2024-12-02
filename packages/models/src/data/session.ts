import zod from "zod";
import { timestampSchema, uidSchema } from "./base";
import { userRoleSchema } from "./user";

export const sessionSchema = zod.object({
	idToken: zod.string(),
	accessToken: zod.string(),
	refreshToken: zod.string(),
	uid: uidSchema,
	idExpires: timestampSchema,
	refreshExpires: timestampSchema,
	actorSystem: zod.string(),
	role: userRoleSchema,
	created: timestampSchema,
	updated: timestampSchema,
	fingerprint: zod.string().optional(), // Fingerprint, is set if this is a temporary account
});

export type Session = zod.infer<typeof sessionSchema>;
