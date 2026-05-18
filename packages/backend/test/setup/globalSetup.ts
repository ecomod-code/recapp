import { MongoMemoryServer } from "mongodb-memory-server";

let server: MongoMemoryServer;

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
	server = await MongoMemoryServer.create();
	provide("mongoUri", server.getUri());
}

export async function teardown() {
	await server.stop();
}
