import { unionize, ofType, UnionOf } from "unionize";
import { Fingerprint } from "../data/session";
import { Id } from "../data/base";

export const FingerprintStoreMessages = unionize(
	{
		StoreFingerprint: ofType<Partial<Fingerprint> & { uid: Id }>(), // Store the session; also removed older sessions of the user
		Block: ofType<Id>(), // Block a fingerprint
		Unblock: ofType<Id>(), // Unblock a fingerprint
		IncreaseCount: ofType<Id>(), // Increase usage count by one
		GetMostRecent: {}, // Get the most recently seen fingerprints
	},
	{ tag: "FingerprintStoreMessages", value: "value" }
);

export type FingerprintStoreMessage = UnionOf<typeof FingerprintStoreMessages>;

export class FingerprintUpdateMessage {
	public readonly tag = "FingerprintUpdateMessage" as const;
	constructor(public readonly fp: Partial<Fingerprint>) {}
}
