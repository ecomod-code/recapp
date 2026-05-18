import { describe, it, expect } from "vitest";
import { anonUserKey } from "../../src/utils/hash";

describe("anonUserKey", () => {
	it("returns a string starting with 'u'", () => {
		expect(anonUserKey("user-123")).toMatch(/^u[0-9a-f]+$/);
	});

	it("is deterministic — same input gives same output", () => {
		expect(anonUserKey("user-abc")).toBe(anonUserKey("user-abc"));
	});

	it("produces different hashes for different ids", () => {
		expect(anonUserKey("user-1")).not.toBe(anonUserKey("user-2"));
	});

	it("salt changes the output", () => {
		expect(anonUserKey("user-1", "quiz-A")).not.toBe(anonUserKey("user-1"));
	});

	it("same id + same salt gives same output", () => {
		expect(anonUserKey("user-1", "quiz-A")).toBe(anonUserKey("user-1", "quiz-A"));
	});

	it("handles null id", () => {
		expect(anonUserKey(null)).toMatch(/^u[0-9a-f]+$/);
	});

	it("handles undefined id", () => {
		expect(anonUserKey(undefined)).toMatch(/^u[0-9a-f]+$/);
	});

	it("handles empty string id", () => {
		expect(anonUserKey("")).toMatch(/^u[0-9a-f]+$/);
	});
});
