import { describe, it, expect } from "vitest";
import { commentSchema } from "../src/data/comment";

const validRawTs = { value: 1_700_000_000_000, type: "Timestamp" as const };

const validComment = {
	uid: "comment-1",
	created: validRawTs,
	updated: validRawTs,
	authorId: "user-1",
	authorName: "Alice",
	text: "Great question!",
	upvoters: [],
	answered: false,
	relatedQuiz: "quiz-1",
};

describe("commentSchema", () => {
	it("parses a minimal valid comment", () => {
		const result = commentSchema.parse(validComment);
		expect(result.uid).toBe("comment-1");
		expect(result.authorName).toBe("Alice");
		expect(result.answered).toBe(false);
		expect(result.upvoters).toHaveLength(0);
		expect(result.relatedQuestion).toBeUndefined();
	});

	it("parses a comment with relatedQuestion", () => {
		const result = commentSchema.parse({ ...validComment, relatedQuestion: "q-99" });
		expect(result.relatedQuestion).toBe("q-99");
	});

	it("parses a comment with multiple upvoters", () => {
		const result = commentSchema.parse({
			...validComment,
			upvoters: ["user-2", "user-3"],
		});
		expect(result.upvoters).toHaveLength(2);
	});

	it("accepts answered: true", () => {
		const result = commentSchema.parse({ ...validComment, answered: true });
		expect(result.answered).toBe(true);
	});

	it("rejects missing authorId", () => {
		const { authorId: _a, ...rest } = validComment;
		expect(() => commentSchema.parse(rest)).toThrow();
	});

	it("rejects missing authorName", () => {
		const { authorName: _a, ...rest } = validComment;
		expect(() => commentSchema.parse(rest)).toThrow();
	});

	it("rejects missing text", () => {
		const { text: _t, ...rest } = validComment;
		expect(() => commentSchema.parse(rest)).toThrow();
	});

	it("rejects missing relatedQuiz", () => {
		const { relatedQuiz: _r, ...rest } = validComment;
		expect(() => commentSchema.parse(rest)).toThrow();
	});

	it("rejects non-boolean answered", () => {
		expect(() => commentSchema.parse({ ...validComment, answered: "yes" })).toThrow();
	});

	it("rejects non-string entries in upvoters", () => {
		expect(() =>
			commentSchema.parse({ ...validComment, upvoters: [123] })
		).toThrow();
	});

	it("rejects missing upvoters field", () => {
		const { upvoters: _u, ...rest } = validComment;
		expect(() => commentSchema.parse(rest)).toThrow();
	});
});
