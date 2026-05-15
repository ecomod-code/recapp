import { describe, it, expect } from "vitest";
import { Timestamp } from "itu-utils";
import { fingerprintSchema, sessionSchema } from "../src/data/session";

const validRawTs = { value: 1_700_000_000_000, type: "Timestamp" as const };

describe("fingerprintSchema", () => {
	const valid = {
		uid: "fp-abc123",
		created: validRawTs,
		updated: validRawTs,
		lastSeen: validRawTs,
		usageCount: 5,
		blocked: false,
		userUid: "user-1",
	};

	it("parses a minimal fingerprint", () => {
		const result = fingerprintSchema.parse(valid);
		expect(result.uid).toBe("fp-abc123");
		expect(result.usageCount).toBe(5);
		expect(result.blocked).toBe(false);
		expect(result.lastSeen).toBeInstanceOf(Timestamp);
		expect(result.initialQuiz).toBeUndefined();
	});

	it("parses fingerprint with initialQuiz", () => {
		const result = fingerprintSchema.parse({ ...valid, initialQuiz: "quiz-42" });
		expect(result.initialQuiz).toBe("quiz-42");
	});

	it("rejects float usageCount", () => {
		expect(() => fingerprintSchema.parse({ ...valid, usageCount: 1.5 })).toThrow();
	});

	it("rejects missing blocked", () => {
		const { blocked: _b, ...rest } = valid;
		expect(() => fingerprintSchema.parse(rest)).toThrow();
	});

	it("rejects missing userUid", () => {
		const { userUid: _u, ...rest } = valid;
		expect(() => fingerprintSchema.parse(rest)).toThrow();
	});

	it("rejects non-boolean blocked", () => {
		expect(() => fingerprintSchema.parse({ ...valid, blocked: 0 })).toThrow();
	});

	it("rejects missing lastSeen", () => {
		const { lastSeen: _l, ...rest } = valid;
		expect(() => fingerprintSchema.parse(rest)).toThrow();
	});
});

describe("sessionSchema", () => {
	const valid = {
		idToken: "eyJ...",
		accessToken: "eyJ...",
		refreshToken: "eyJ...",
		uid: "user-1",
		idExpires: validRawTs,
		refreshExpires: validRawTs,
		actorSystem: "akka://recapp@host:2551",
		role: "STUDENT" as const,
		created: validRawTs,
		updated: validRawTs,
	};

	it("parses a minimal valid session", () => {
		const result = sessionSchema.parse(valid);
		expect(result.uid).toBe("user-1");
		expect(result.role).toBe("STUDENT");
		expect(result.idExpires).toBeInstanceOf(Timestamp);
		expect(result.fingerprint).toBeUndefined();
		expect(result.persistentCookie).toBeUndefined();
	});

	it("parses session with fingerprint and persistentCookie", () => {
		const result = sessionSchema.parse({
			...valid,
			fingerprint: "fp-xyz",
			persistentCookie: true,
		});
		expect(result.fingerprint).toBe("fp-xyz");
		expect(result.persistentCookie).toBe(true);
	});

	it.each(["STUDENT", "TEACHER", "ADMIN"] as const)("accepts role %s", role => {
		const result = sessionSchema.parse({ ...valid, role });
		expect(result.role).toBe(role);
	});

	it("rejects unknown role", () => {
		expect(() => sessionSchema.parse({ ...valid, role: "GUEST" })).toThrow();
	});

	it("rejects missing idToken", () => {
		const { idToken: _i, ...rest } = valid;
		expect(() => sessionSchema.parse(rest)).toThrow();
	});

	it("rejects missing accessToken", () => {
		const { accessToken: _a, ...rest } = valid;
		expect(() => sessionSchema.parse(rest)).toThrow();
	});

	it("rejects missing refreshToken", () => {
		const { refreshToken: _r, ...rest } = valid;
		expect(() => sessionSchema.parse(rest)).toThrow();
	});

	it("rejects missing uid", () => {
		const { uid: _u, ...rest } = valid;
		expect(() => sessionSchema.parse(rest)).toThrow();
	});

	it("rejects missing actorSystem", () => {
		const { actorSystem: _a, ...rest } = valid;
		expect(() => sessionSchema.parse(rest)).toThrow();
	});

	it("rejects non-string idToken", () => {
		expect(() => sessionSchema.parse({ ...valid, idToken: 123 })).toThrow();
	});
});
