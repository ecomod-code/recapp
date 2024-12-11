import zod from "zod";
import { idEntitySchema, timestampSchema, uidSchema } from "./base";

export const userRoleSchema = zod.enum(["STUDENT", "TEACHER", "ADMIN"]);

export const userParticipationSchema = zod.enum(["NAME", "NICKNAME", "ANONYMOUS"]);

export type UserRole = zod.infer<typeof userRoleSchema>;

export type UserParticipation = zod.infer<typeof userParticipationSchema>;

const quizUsageType = zod.object({
	type: userParticipationSchema, // Which usage type was selected
	name: zod.string().optional(), // Real name or nickname of participating student
});

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
