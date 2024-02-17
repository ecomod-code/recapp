import zod from "zod";
import { idSchema, timestampSchema, uidSchema } from "./base";

export const userRoleSchema = zod.enum(["STUDENT", "TEACHER", "ADMIN"]);

export const userParticipationSchema = zod.enum(["NAME", "NICKNAME", "ANONYMOUS"]);

export type UserRole = zod.infer<typeof userRoleSchema>;

export type UserParticipation = zod.infer<typeof userParticipationSchema>;

export const userSessionSchema = zod
	.object({
		userId: uidSchema, // User who is associated with this session
		accessToken: zod.string(),
		idToken: zod.string(),
		refreshToken: zod.string(),
		expires: timestampSchema, // Expiry time of the session
	})
	.merge(idSchema);

export type UserSession = zod.infer<typeof userSessionSchema>;

const quizUsageType = zod.object({
	type: userParticipationSchema, // Which usage type was selected
	name: zod.string().optional(), // Real name or nickname of participating student
});

export const userSchema = zod
	.object({
		role: userRoleSchema, // Role of user
		username: zod.string(), // Username (as provisioned by the ID provider)
		lastLogin: timestampSchema, // Date of last login
		active: zod.boolean(), // Whether the user can login
		quizUsage: zod.map(uidSchema, quizUsageType), // How the user decided to participate in each individual quiz
	})
	.merge(idSchema);

export type User = zod.infer<typeof userSchema>;
