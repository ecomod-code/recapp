import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { ActorUri, Fingerprint, FingerprintStoreMessage, FingerprintStoreMessages, FingerprintUpdateMessage, Id, User, UserStoreMessage, UserStoreMessages } from "@recapp/models";
import { identity, pick } from "rambda";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";
import { logger } from "../logger";

type FingerprintStoreResult = Unit | Error | Fingerprint | boolean;

type FingerprintStoreState = {
	cache: Map<Id, Fingerprint>;
	lastTouched: Map<Id, Timestamp>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, CollecionSubscription>;
	lastSeen: Map<ActorUri, Timestamp>;
};

export class FingerprintStore extends SubscribableActor<Fingerprint, FingerprintStoreMessage, FingerprintStoreResult> {
	protected override state: FingerprintStoreState = { cache: new Map(), lastTouched: new Map(), subscribers: new Map(), collectionSubscribers: new Map(), lastSeen: new Map() };

	public constructor(name: string, system: ActorSystem) {
		super(name, system, "fingerprints");
	}

	protected override updateIndices(_draft: FingerprintStoreState, _entity: Fingerprint): void {
		// No index needed for fingerprints
	}

	private updateSubscribers(fingerprint: Partial<Fingerprint> & { uid : Id }) {
		for (const [subscriber, subscription] of this.state.collectionSubscribers) {
			this.send(
				subscriber,
				new FingerprintUpdateMessage(
					subscription.properties.length > 0
						? pick(subscription.properties, fingerprint)
						: fingerprint
				)
			);
		}
		for (const subscriber of this.state.subscribers.get(fingerprint.uid) ?? new Set()) {
			this.send(subscriber, new FingerprintUpdateMessage(fingerprint));
		}
	}

	public async receive(from: ActorRef, message: FingerprintStoreMessage): Promise<FingerprintStoreResult> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
			return new Error(`Operation not allowed`);
		}
		const result = await FingerprintStoreMessages.match<Promise<FingerprintStoreResult>>(message, {
			StoreFingerprint: async fingerprint => {
				const currentFingerprint = (await this.getEntity(fingerprint.uid)).orElse({} as Fingerprint);
				fingerprint.updated = toTimestamp();
				const newFingerprint = { ...currentFingerprint, ...fingerprint };
				logger.debug(`Storing new fingerprint ${JSON.stringify(newFingerprint)}`);
				await this.storeEntity(newFingerprint);
				return unit();
			},
			Get: async id => {
				const result = await this.getEntity(id);
				const retVal = result.match<Error | Fingerprint>(identity, () => new Error(`Unknown fingerprint id ${id}`));
				return Promise.resolve(retVal)
			},
			Block: async id => {
				const fp = (await this.getEntity(id)).orUndefined();
				if (!fp) {
					return new Error(`Unknown fingerprint id ${id}`);
				}
				const { uid } = await this.ask<UserStoreMessage, User>("actors://recapp-backend/UserStore", UserStoreMessages.GetByFingerprint(id));
				const updated = { ...fp, blocked: true };
				await this.storeEntity(updated);
				this.updateSubscribers(updated);
				if (uid) {
					this.send("actors://recapp-backend/UserStore", UserStoreMessages.Update({ uid, active: false }));
				}
				return unit();
			},
			Unblock: async id => {
				const fp = (await this.getEntity(id)).orUndefined();
				if (!fp) {
					return new Error(`Unknown fingerprint id ${id}`);
				}
				const { uid } = await this.ask<UserStoreMessage, User>("actors://recapp-backend/UserStore", UserStoreMessages.GetByFingerprint(id));
				const updated = { ...fp, blocked: false };
				await this.storeEntity(updated);
				this.updateSubscribers(updated);
				if (uid) {
					this.send("actors://recapp-backend/UserStore", UserStoreMessages.Update({ uid, active: true }));
				}
				return unit();
			},
			IncreaseCount: async ({fingerprint, userUid, initialQuiz}) => {
				const fp = (await this.getEntity(fingerprint)).orUndefined();
				if (!fp) {
					return new Error(`Unknown fingerprint id ${fingerprint}`);
				}
				const updated = { ...fp, usageCount: fp.usageCount + 1, lastSeen: toTimestamp(), userUid, initialQuiz: initialQuiz ?? fp.initialQuiz };
				await this.storeEntity(updated);
				this.updateSubscribers(updated);
				return unit();
			},
			GetMostRecent: async () => {
				const db = await this.connector.db();
				const fps = await db.collection<Fingerprint>(this.collectionName).find({}).sort({lastSeen: 1}).limit(100).toArray();
				fps.forEach(fp => {
					const { _id, ...rest } = fp;
					this.send(from, new FingerprintUpdateMessage(rest));
				});
				return unit();
			},
			SubscribeToCollection: async () => {
				this.state = create(this.state, draft => {
					draft.lastSeen.set(from.name as ActorUri, toTimestamp());
					draft.collectionSubscribers.set(from.name as ActorUri, {
						properties: [],
						userId: clientUserId,
						userRole: clientUserRole,
					});
				});
				return unit();
			},
			default: async () => new Error(`Unknown message from ${from.name}: ${JSON.stringify(message, undefined, 2)}`),
		});
		return result;
	}
}
