import zod from "zod";
import { idEntitySchema, timestampSchema, uidSchema } from "./base";

/**
 * User roles supported by Recapp.
 *
 * - `STUDENT`: regular student user
 * - `TEACHER`: teacher or quiz owner
 * - `ADMIN`: Recapp administrator with elevated rights
 */
export const userRoleSchema = zod.enum(["STUDENT", "TEACHER", "ADMIN"]);

/**
 * How a user participates in a specific quiz.
 *
 * - `NAME`: show real name
 * - `NICKNAME`: show a nickname
 * - `ANONYMOUS`: do not show identifying information
 */
export const userParticipationSchema = zod.enum(["NAME", "NICKNAME", "ANONYMOUS"]);

export type UserRole = zod.infer<typeof userRoleSchema>;

export type UserParticipation = zod.infer<typeof userParticipationSchema>;

/**
 * Participation settings of a user in a single quiz.
 *
 * Stores which participation mode was chosen and, if needed,
 * the concrete name/nickname to display.
 */
const quizUsageType = zod.object({
	type: userParticipationSchema, // Which usage type was selected
	name: zod.string().optional(), // Real name or nickname of participating student
});

/**
 * Schema and type for users in Recapp.
 *
 * A user has:
 * - a global role (`STUDENT`, `TEACHER`, `ADMIN`),
 * - identity information from the IdP (username, optional email/nickname),
 * - last login and active flag,
 * - quiz-specific participation settings (real name / nickname / anonymous),
 * - optional metadata for temporary accounts (fingerprint, initial quiz).
 *
 * Base entity fields are merged via `idEntitySchema`.
 */
export const userSchema = zod
	.object({
		role: userRoleSchema, // Role of user
		username: zod.string(), // Username (as provisioned by the ID provider)
		nickname: zod.string().optional(),
		email: zod.string().optional(),
		lastLogin: timestampSchema, // Date of last login
		active: zod.boolean(), // Whether the user can login
		quizUsage: zod.map(uidSchema, quizUsageType), // How the user decided to participate in each individual quiz
		isTemporary: zod.boolean().optional().default(false), // Is this a temporary account
		fingerprint: zod.string().optional(), // Fingerprint of a temp user for authentication purposes
		initialQuiz: zod.string().optional(), // Initial quiz, if any (will be set if the user logged in or was created with a link)
	})
	.merge(idEntitySchema);

export type User = zod.infer<typeof userSchema>;
