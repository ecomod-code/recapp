import zod from "zod";
import { timestampSchema, uidSchema } from "./base";
import { userRoleSchema } from "./user";

export const fingerprintSchema = zod.object({
	uid: uidSchema, // This is also the fingerprint string itself
	created: timestampSchema,
	updated: timestampSchema,
	lastSeen: timestampSchema,
	usageCount: zod.number().int(),
	blocked: zod.boolean(),
	userUid: uidSchema,
	initialQuiz: uidSchema.optional()
});

export type Fingerprint = zod.infer<typeof fingerprintSchema>;

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
	persistentCookie: zod.boolean().optional() // Whether this is a temporary account that is not deleted when closing the browser but stored in a persistentcookie
});

export type Session = zod.infer<typeof sessionSchema>;
