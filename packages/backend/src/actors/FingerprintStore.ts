import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { ActorUri, Fingerprint, FingerprintStoreMessage, FingerprintStoreMessages, FingerprintUpdateMessage, Id } from "@recapp/models";
import { pick } from "rambda";
import { CollecionSubscription, SubscribableActor } from "./SubscribableActor";

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
		const [clientUserRole] = await this.determineRole(from);
		if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
			return new Error(`Operation not allowed`);
		}
		const result = await FingerprintStoreMessages.match<Promise<FingerprintStoreResult>>(message, {
			StoreFingerprint: async session => {
				this.state = await create(this.state, async draft => {
					const currentSession = (await this.getEntity(session.uid)).orElse({} as Fingerprint);
					session.updated = toTimestamp();
					const newSession = { ...currentSession, ...session };
					draft.cache.set(session.uid, newSession);
					this.storeEntity(newSession);
				});
				return unit();
			},
			Block: async id => {
				const mbFingerprint = await this.getEntity(id)
				return mbFingerprint.match<Unit|Error>(
					fp => {
						this.storeEntity({...fp, blocked: true});
						this.updateSubscribers({...fp, blocked: true})
						return unit();
					},
					() => {
						return new Error(`Unknown fingerprint id ${id}`);
					}
				)
			},
			Unblock: async id => {
				const mbFingerprint = await this.getEntity(id)
				return mbFingerprint.match<Unit|Error>(
					fp => {
						this.storeEntity({...fp, blocked: false});
						this.updateSubscribers({...fp, blocked: true})
						return unit();
					},
					() => {
						return new Error(`Unknown fingerprint id ${id}`);
					}
				)
			},
			IncreaseCount: async id => {
				const mbFingerprint = await this.getEntity(id)
				return mbFingerprint.match<Unit|Error>(
					fp => {
						this.storeEntity({...fp, usageCount: fp.usageCount + 1});
						this.updateSubscribers({...fp, blocked: true})
						return unit();
					},
					() => {
						return new Error(`Unknown fingerprint id ${id}`);
					}
				)
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
			default: async () => new Error(`Unknown message from ${from.name}`),
		});
		return result;
	}
}
