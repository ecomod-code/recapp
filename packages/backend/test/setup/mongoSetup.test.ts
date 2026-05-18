import Container from "typedi";
import { DbClient } from "../../src/DbClient";

describe("MongoDB mock wiring", () => {
	test("DbClient in Container returns mock db", async () => {
		const dbClient = Container.get(DbClient);
		const db = await dbClient.db();
		expect(db).toBeDefined();
	});

	test("can insert and retrieve a document via mock", async () => {
		const dbClient = Container.get(DbClient);
		const db = await dbClient.db();
		const col = db.collection("smoke");
		await col.insertOne({ uid: "test-1", hello: "world" } as any);
		const doc = await col.findOne({ uid: "test-1" });
		expect((doc as any).hello).toBe("world");
	});

	test("mock resets between tests", async () => {
		const dbClient = Container.get(DbClient);
		const db = await dbClient.db();
		const col = db.collection("smoke");
		const doc = await col.findOne({ uid: "test-1" });
		expect(doc).toBeNull();
	});

	test("updateOne with upsert creates a document", async () => {
		const dbClient = Container.get(DbClient);
		const db = await dbClient.db();
		const col = db.collection("smoke");
		const result = await col.updateOne({ uid: "new-1" }, { $set: { uid: "new-1", val: 42 } }, { upsert: true });
		expect(result.upsertedCount).toBe(1);
		const doc = await col.findOne({ uid: "new-1" });
		expect((doc as any).val).toBe(42);
	});
});
