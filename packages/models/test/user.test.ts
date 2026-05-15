import { describe, it, expect } from "vitest";
import { Timestamp } from "itu-utils";
import { userRoleSchema, userParticipationSchema, userSchema } from "../src/data/user";

const validRawTs = { value: 1_700_000_000_000, type: "Timestamp" as const };

const validUser = {
	uid: "user-1",
	created: validRawTs,
	updated: validRawTs,
	role: "TEACHER" as const,
	username: "teacher@example.com",
	lastLogin: validRawTs,
	active: true,
	quizUsage: new Map(),
};

describe("userRoleSchema", () => {
	it.each(["STUDENT", "TEACHER", "ADMIN"] as const)("accepts %s", role => {
		expect(userRoleSchema.parse(role)).toBe(role);
	});

	it("rejects an unknown role", () => {
		expect(() => userRoleSchema.parse("MODERATOR")).toThrow();
	});

	it("rejects empty string", () => {
		expect(() => userRoleSchema.parse("")).toThrow();
	});
});

describe("userParticipationSchema", () => {
	it.each(["NAME", "NICKNAME", "ANONYMOUS"] as const)("accepts %s", mode => {
		expect(userParticipationSchema.parse(mode)).toBe(mode);
	});

	it("rejects an unknown participation type", () => {
		expect(() => userParticipationSchema.parse("GUEST")).toThrow();
	});
});

describe("userSchema", () => {
	it("parses a minimal valid user", () => {
		const result = userSchema.parse(validUser);
		expect(result.uid).toBe("user-1");
		expect(result.role).toBe("TEACHER");
		expect(result.username).toBe("teacher@example.com");
		expect(result.active).toBe(true);
		expect(result.lastLogin).toBeInstanceOf(Timestamp);
		expect(result.isTemporary).toBe(false); // default
		expect(result.quizUsage).toBeInstanceOf(Map);
	});

	it("parses optional nickname and email", () => {
		const result = userSchema.parse({
			...validUser,
			nickname: "Prof. X",
			email: "x@uni.edu",
		});
		expect(result.nickname).toBe("Prof. X");
		expect(result.email).toBe("x@uni.edu");
	});

	it("accepts STUDENT role", () => {
		const result = userSchema.parse({ ...validUser, role: "STUDENT" });
		expect(result.role).toBe("STUDENT");
	});

	it("applies isTemporary default of false", () => {
		const result = userSchema.parse(validUser);
		expect(result.isTemporary).toBe(false);
	});

	it("accepts isTemporary: true", () => {
		const result = userSchema.parse({ ...validUser, isTemporary: true, fingerprint: "fp-abc" });
		expect(result.isTemporary).toBe(true);
		expect(result.fingerprint).toBe("fp-abc");
	});

	it("accepts initialQuiz field", () => {
		const result = userSchema.parse({ ...validUser, initialQuiz: "quiz-99" });
		expect(result.initialQuiz).toBe("quiz-99");
	});

	it("parses quizUsage map with entries", () => {
		const quizUsage = new Map([
			["quiz-1", { type: "ANONYMOUS" as const }],
			["quiz-2", { type: "NAME" as const, name: "Alice" }],
		]);
		const result = userSchema.parse({ ...validUser, quizUsage });
		expect(result.quizUsage.size).toBe(2);
	});

	it("rejects an invalid role", () => {
		expect(() => userSchema.parse({ ...validUser, role: "SUPERUSER" })).toThrow();
	});

	it("rejects missing username", () => {
		const { username: _u, ...rest } = validUser;
		expect(() => userSchema.parse(rest)).toThrow();
	});

	it("rejects missing lastLogin", () => {
		const { lastLogin: _l, ...rest } = validUser;
		expect(() => userSchema.parse(rest)).toThrow();
	});

	it("rejects non-boolean active", () => {
		expect(() => userSchema.parse({ ...validUser, active: "yes" })).toThrow();
	});

	it("rejects quizUsage as plain object (must be a Map)", () => {
		expect(() => userSchema.parse({ ...validUser, quizUsage: {} })).toThrow();
	});
});
