import { Actor, ActorRef, ActorSystem } from "ts-actors";
import { DateTime } from "luxon";
import { toTimestamp } from "itu-utils";
import { vi } from "vitest";
import { SessionStore } from "../src/actors/SessionStore";
import { Session, SessionStoreMessages } from "@recapp/models";
import { mockDbInstance } from "./setup/mongoMock";

// ts-actors surfaces a thrown handler error to the registered error receiver (it does not
// reject the ask). Capturing here lets us assert the awaited write's failure is surfaced.
const captured: unknown[] = [];
class ErrorReceiver extends Actor<unknown, unknown> {
	public constructor(name: string, system: ActorSystem) {
		super(name, system);
	}
	public async receive(_from: ActorRef, message: unknown): Promise<unknown> {
		captured.push(message);
		return undefined;
	}
}

async function waitFor(pred: () => boolean, timeoutMs = 2000): Promise<void> {
	const start = Date.now();
	while (!pred() && Date.now() - start < timeoutMs) {
		await new Promise(r => setTimeout(r, 10));
	}
}

function makeSession(overrides: Partial<Session> = {}): Session {
	const now = toTimestamp();
	const future = toTimestamp(DateTime.utc().plus({ hours: 1 }));
	return {
		idToken: "id",
		accessToken: "access",
		refreshToken: "refresh",
		uid: "user-1" as any,
		idExpires: future,
		refreshExpires: future,
		actorSystem: "client-system-1",
		role: "STUDENT",
		created: now,
		updated: now,
		...overrides,
	};
}

// Characterises the await-and-call fix: SessionStore.StoreSession awaits storeEntity,
// so the write is committed (and failures surfaced) before the ask resolves — previously
// it was fire-and-forget, so a failed write during a Mongo blip was silently lost.
describe("SessionStore — awaited persistence", () => {
	let system: ActorSystem;

	beforeEach(async () => {
		captured.length = 0;
		system = await ActorSystem.create({ systemName: "recapp-backend" });
	});

	afterEach(async () => {
		await system.shutdown();
		vi.restoreAllMocks();
	});

	test("StoreSession has committed the session to the DB by the time the ask resolves", async () => {
		const ref = await system.createActor(SessionStore, { name: "SessionStore" });
		await system.ask(ref, SessionStoreMessages.StoreSession(makeSession()));
		const doc = await mockDbInstance.collection("sessions").findOne({ uid: "user-1" });
		expect(doc).not.toBeNull();
		expect((doc as any).accessToken).toBe("access");
	});

	test("a failed DB write surfaces to the error receiver instead of being swallowed", async () => {
		await system.createActor(ErrorReceiver, { name: "ErrorActor", errorReceiver: true });
		const ref = await system.createActor(SessionStore, { name: "SessionStore" });
		vi.spyOn(mockDbInstance.collection("sessions"), "updateOne").mockRejectedValueOnce(
			new Error("connection lost")
		);
		// Fire without awaiting: on throw the ask never resolves, but the error is surfaced.
		void system.ask(ref, SessionStoreMessages.StoreSession(makeSession())).catch(() => undefined);
		await waitFor(() => captured.length > 0);
		expect(captured.length).toBeGreaterThan(0);
		expect(JSON.stringify(captured[0])).toContain("connection lost");
	});
});
