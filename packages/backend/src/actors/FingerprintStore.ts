import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { ActorUri, Fingerprint, FingerprintStoreMessage, FingerprintStoreMessages, FingerprintUpdateMessage, Id, User, UserStoreMessage, UserStoreMessages } from "@recapp/models";
import { identity, pick } from "rambda";
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
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
			return new Error(`Operation not allowed`);
		}
		const result = await FingerprintStoreMessages.match<Promise<FingerprintStoreResult>>(message, {
			StoreFingerprint: async fingerprint => {
				this.state = await create(this.state, async draft => {
					const currentFingerprint = (await this.getEntity(fingerprint.uid)).orElse({} as Fingerprint);
					fingerprint.updated = toTimestamp();
					const newFingerprint = { ...currentFingerprint, ...fingerprint };
					draft.cache.set(fingerprint.uid, newFingerprint);
					console.debug("SToring new fingerprint", newFingerprint);
					this.storeEntity(newFingerprint);
				});
				return unit();
			},
			Get: async id => {
				const result = await this.getEntity(id);
				const retVal = result.match<Error | Fingerprint>(identity, () => new Error(`Unknown fingerprint id ${id}`));
				return Promise.resolve(retVal)
			},
			Block: async id => {
				const mbFingerprint = await this.getEntity(id)
				const {uid} = await this.ask<UserStoreMessage, User>("actors://recapp-backend/UserStore", UserStoreMessages.GetByFingerprint(id));
				return mbFingerprint.match<Unit|Error>(
					fp => {
						this.storeEntity({...fp, blocked: true});
						this.updateSubscribers({...fp, blocked: true})
						if (uid)
							this.send("actors://recapp-backend/UserStore", UserStoreMessages.Update({ uid: fp.uid, active: false }));
						return unit();
					},
					() => {
						return new Error(`Unknown fingerprint id ${id}`);
					}
				)
			},
			Unblock: async id => {
				const mbFingerprint = await this.getEntity(id)
				const {uid} = await this.ask<UserStoreMessage, User>("actors://recapp-backend/UserStore", UserStoreMessages.GetByFingerprint(id));
				return mbFingerprint.match<Unit|Error>(
					fp => {
						this.storeEntity({...fp, blocked: false});
						this.updateSubscribers({...fp, blocked: false})
						if (uid)
							this.send("actors://recapp-backend/UserStore", UserStoreMessages.Update({ uid: fp.uid, active: true }));
						return unit();
					},
					() => {
						return new Error(`Unknown fingerprint id ${id}`);
					}
				)
			},
			IncreaseCount: async ({fingerprint, userUid, initialQuiz}) => {
				const mbFingerprint = await this.getEntity(fingerprint)
				return mbFingerprint.match<Unit|Error>(
					fp => {
						this.storeEntity({...fp, usageCount: fp.usageCount + 1, lastSeen: toTimestamp(), userUid, initialQuiz: initialQuiz ?? fp.initialQuiz});
						this.updateSubscribers({...fp, usageCount: fp.usageCount + 1, lastSeen: toTimestamp(), userUid, initialQuiz: initialQuiz ?? fp.initialQuiz})
						return unit();
					},
					() => {
						return new Error(`Unknown fingerprint id ${fingerprint}`);
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
