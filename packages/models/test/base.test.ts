import { describe, it, expect } from "vitest";
import { Timestamp } from "itu-utils";
import {
	timestampSchema,
	uidSchema,
	actorUriSchema,
	idEntitySchema,
	toId,
	toActorUri,
	validationOkay,
} from "../src/data/base";

const validRawTs = { value: 1_700_000_000_000, type: "Timestamp" as const };

describe("timestampSchema", () => {
	it("transforms a valid raw object into a Timestamp instance", () => {
		const result = timestampSchema.parse(validRawTs);
		expect(result).toBeInstanceOf(Timestamp);
		expect(result.value).toBe(validRawTs.value);
	});

	it("rejects a non-integer value", () => {
		expect(() => timestampSchema.parse({ value: 1.5, type: "Timestamp" })).toThrow();
	});

	it("rejects wrong tag", () => {
		expect(() => timestampSchema.parse({ value: 0, type: "Other" })).toThrow();
	});

	it("rejects missing value field", () => {
		expect(() => timestampSchema.parse({ type: "Timestamp" })).toThrow();
	});

	it("rejects missing type field", () => {
		expect(() => timestampSchema.parse({ value: 1_700_000_000_000 })).toThrow();
	});

	it("accepts zero as value (epoch)", () => {
		const result = timestampSchema.parse({ value: 0, type: "Timestamp" });
		expect(result.value).toBe(0);
	});

	it("rejects a string value", () => {
		expect(() => timestampSchema.parse({ value: "not-a-number", type: "Timestamp" })).toThrow();
	});
});

describe("uidSchema", () => {
	it("parses a normal string", () => {
		const id = uidSchema.parse("abc-123");
		expect(id).toBe("abc-123");
	});

	it("rejects a number", () => {
		expect(() => uidSchema.parse(42)).toThrow();
	});

	it("rejects null", () => {
		expect(() => uidSchema.parse(null)).toThrow();
	});

	it("accepts an empty string (no min-length constraint)", () => {
		expect(uidSchema.parse("")).toBe("");
	});
});

describe("actorUriSchema", () => {
	it("parses a valid URI string", () => {
		const uri = actorUriSchema.parse("akka://system@host:2551/user/myActor");
		expect(uri).toBe("akka://system@host:2551/user/myActor");
	});

	it("rejects a number", () => {
		expect(() => actorUriSchema.parse(9)).toThrow();
	});
});

describe("toId / toActorUri helpers", () => {
	it("toId returns the string unchanged", () => {
		expect(toId("my-uid")).toBe("my-uid");
	});

	it("toActorUri returns the string unchanged", () => {
		expect(toActorUri("akka://sys/user/x")).toBe("akka://sys/user/x");
	});
});

describe("idEntitySchema", () => {
	const validEntity = {
		uid: "uid-1",
		created: validRawTs,
		updated: validRawTs,
	};

	it("parses a minimal entity without archived", () => {
		const result = idEntitySchema.parse(validEntity);
		expect(result.uid).toBe("uid-1");
		expect(result.created).toBeInstanceOf(Timestamp);
		expect(result.updated).toBeInstanceOf(Timestamp);
		expect(result.archived).toBeUndefined();
	});

	it("parses an entity with archived set", () => {
		const result = idEntitySchema.parse({ ...validEntity, archived: validRawTs });
		expect(result.archived).toBeInstanceOf(Timestamp);
	});

	it("rejects missing uid", () => {
		const { uid: _uid, ...rest } = validEntity;
		expect(() => idEntitySchema.parse(rest)).toThrow();
	});

	it("rejects missing created", () => {
		const { created: _c, ...rest } = validEntity;
		expect(() => idEntitySchema.parse(rest)).toThrow();
	});

	it("rejects missing updated", () => {
		const { updated: _u, ...rest } = validEntity;
		expect(() => idEntitySchema.parse(rest)).toThrow();
	});

	it("rejects a non-string uid", () => {
		expect(() => idEntitySchema.parse({ ...validEntity, uid: 99 })).toThrow();
	});
});

describe("validationOkay", () => {
	it("returns true when all values are true", () => {
		expect(validationOkay({ a: true, b: true, c: true })).toBe(true);
	});

	it("returns false when any value is false", () => {
		expect(validationOkay({ a: true, b: false, c: true })).toBe(false);
	});

	it("returns false when all values are false", () => {
		expect(validationOkay({ x: false })).toBe(false);
	});

	it("returns true for an empty object (vacuously)", () => {
		expect(validationOkay({})).toBe(true);
	});
});
