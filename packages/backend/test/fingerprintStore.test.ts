import { Actor, ActorRef, ActorSystem } from "ts-actors";
import { toTimestamp } from "itu-utils";
import { vi } from "vitest";
import { FingerprintStore } from "../src/actors/FingerprintStore";
import { Fingerprint, FingerprintStoreMessages } from "@recapp/models";
import { mockDbInstance } from "./setup/mongoMock";

// FingerprintStore.Block asks UserStore for the owning user; a minimal stub keeps the
// test free of the real UserStore while exercising the awaited block write.
class UserStoreStub extends Actor<any, any> {
	public constructor(name: string, system: ActorSystem) {
		super(name, system);
	}
	public async receive(_from: ActorRef, _message: any): Promise<any> {
		return { uid: "user-1" };
	}
}

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

function makeFingerprint(overrides: Partial<Fingerprint> = {}): Fingerprint {
	const now = toTimestamp();
	return {
		uid: "fp-1" as any,
		created: now,
		updated: now,
		lastSeen: now,
		usageCount: 1,
		blocked: false,
		userUid: "user-1" as any,
		...overrides,
	};
}

// Characterises the await-and-call fix on the moderation store: block/unblock and store
// writes are awaited, so a blocked fingerprint is persisted before the ask resolves and
// cannot silently revert to unblocked after a restart (the note's headline risk).
describe("FingerprintStore — awaited persistence", () => {
	let system: ActorSystem;

	beforeEach(async () => {
		captured.length = 0;
		system = await ActorSystem.create({ systemName: "recapp-backend" });
	});

	afterEach(async () => {
		await system.shutdown();
		vi.restoreAllMocks();
	});

	test("StoreFingerprint commits the fingerprint to the DB before the ask resolves", async () => {
		const ref = await system.createActor(FingerprintStore, { name: "FingerprintStore" });
		await system.ask(ref, FingerprintStoreMessages.StoreFingerprint(makeFingerprint()));
		const doc = await mockDbInstance.collection("fingerprints").findOne({ uid: "fp-1" });
		expect(doc).not.toBeNull();
		expect((doc as any).blocked).toBe(false);
	});

	test("Block persists blocked:true (awaited) so a restart can't revert it", async () => {
		await system.createActor(UserStoreStub, { name: "UserStore" });
		const ref = await system.createActor(FingerprintStore, { name: "FingerprintStore" });
		await system.ask(ref, FingerprintStoreMessages.StoreFingerprint(makeFingerprint()));
		await system.ask(ref, FingerprintStoreMessages.Block("fp-1" as any));
		const doc = await mockDbInstance.collection("fingerprints").findOne({ uid: "fp-1" });
		expect((doc as any).blocked).toBe(true);
	});

	test("a failed fingerprint write surfaces to the error receiver instead of being swallowed", async () => {
		await system.createActor(ErrorReceiver, { name: "ErrorActor", errorReceiver: true });
		const ref = await system.createActor(FingerprintStore, { name: "FingerprintStore" });
		vi.spyOn(mockDbInstance.collection("fingerprints"), "updateOne").mockRejectedValueOnce(
			new Error("connection lost")
		);
		// Fire without awaiting: on throw the ask never resolves, but the error is surfaced.
		void system.ask(ref, FingerprintStoreMessages.StoreFingerprint(makeFingerprint())).catch(() => undefined);
		await waitFor(() => captured.length > 0);
		expect(captured.length).toBeGreaterThan(0);
		expect(JSON.stringify(captured[0])).toContain("connection lost");
	});
});
