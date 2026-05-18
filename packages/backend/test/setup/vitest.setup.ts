import { Db } from "mongodb";
import Container from "typedi";
import { DbClient } from "../../src/DbClient";
import { getMockDb, mockDbInstance } from "./mongoMock";

class TestDbClient extends DbClient {
	override async client(): Promise<never> {
		throw new Error("Direct MongoClient access is not available in tests");
	}
	override async db(): Promise<Db> {
		return getMockDb();
	}
	override shutdown(): Promise<void> {
		return Promise.resolve();
	}
}

const testDbClient = new TestDbClient();

beforeAll(() => {
	Container.reset();
	Container.set({ id: DbClient, value: testDbClient });
});

afterEach(() => {
	mockDbInstance.reset();
});

afterAll(() => {
	Container.reset();
});
