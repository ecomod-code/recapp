import { unionize, ofType, UnionOf } from "unionize";
import { Fingerprint } from "../data/session";
import { Id } from "../data/base";

/**
 * Messages handled by the actor that manages browser/device fingerprints.
 *
 * The `FingerprintStore` tracks fingerprints, blocks/unblocks them and
 * maintains usage counts for temporary/anonymous users.
 */
export const FingerprintStoreMessages = unionize(
	{
		/**
		 * Store or update a fingerprint entry.
		 *
		 * Payload is a partial `Fingerprint` plus its `uid`. The actor
		 * persists the fingerprint and may clean up older entries for
		 * the same user.
		 */
		StoreFingerprint: ofType<Partial<Fingerprint> & { uid: Id }>(),

		/**
		 * Retrieve information about a single fingerprint by id.
		 */
		Get: ofType<Id>(),

		/**
		 * Block a fingerprint so it can no longer be used.
		 */
		Block: ofType<Id>(), 

		/**
		 * Unblock a previously blocked fingerprint.
		 */
		Unblock: ofType<Id>(), 

		/**
		 * Increase the usage count for a fingerprint.
		 *
		 * Payload contains:
		 * - `fingerprint`: the fingerprint id,
		 * - `userUid`: the associated user id,
		 * - `initialQuiz`: optional quiz id tied to this fingerprint.
		 */
		IncreaseCount: ofType<{fingerprint: Id, userUid: Id, initialQuiz: Id | undefined}>(),

		/**
		 * Request the most recently seen fingerprints.
		 *
		 * The actor responds with a list of `Fingerprint` entries.
		 */
		GetMostRecent: {}, 

		/**
		 * Subscribe to changes in the fingerprint collection.
		 *
		 * After subscribing, the caller receives `FingerprintUpdateMessage`
		 * events when fingerprints change.
		 */
		SubscribeToCollection: {}
	},
	{ tag: "FingerprintStoreMessages", value: "value" }
);

/**
 * Union type of all messages accepted by the `FingerprintStore` actor.
 */
export type FingerprintStoreMessage = UnionOf<typeof FingerprintStoreMessages>;

/**
 * Message sent to subscribers when a fingerprint entry is created or updated.
 *
 * Carries a partial `Fingerprint` object; at minimum the `uid` is present,
 * plus any fields that changed.
 */
export class FingerprintUpdateMessage {
	public readonly tag = "FingerprintUpdateMessage" as const;
	constructor(public readonly fp: Partial<Fingerprint>) {}
}
