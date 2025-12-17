import zod from "zod";
import { timestampSchema, uidSchema } from "./base";
import { userRoleSchema } from "./user";

/**
 * Schema and type for browser/device fingerprints.
 *
 * A fingerprint ties an anonymous/temporary account to a browser instance.
 * The `uid` field contains the fingerprint string itself. Additional fields
 * track when the fingerprint was first seen, last used, how often it was
 * used, whether it is blocked, which user it is associated with and an
 * optional initial quiz.
 */
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


/**
 * Schema and type for authenticated sessions.
 *
 * A session represents a logged-in user, including:
 * - OpenID Connect tokens (`idToken`, `accessToken`, `refreshToken`),
 * - token expiry times,
 * - the associated user id and role,
 * - the actor system identifier used by the frontend,
 * - optional fingerprint and cookie configuration for temporary accounts.
 */
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
