import { ActorUri, Id } from "@recapp/models";
import { ActorSystem } from "ts-actors";
import { Document } from "mongodb";
import { create } from "mutative";
import { Timestamp, fromTimestamp, toTimestamp } from "itu-utils";
import { DateTime } from "luxon";
import { AccessRole, CLEANUP_INTERVAL, StoringActor } from "./StoringActor";
import { CHECK_TIME, GetClosedClientList } from "./ErrorActor";
import { createActorUri } from "../utils";

export type CollecionSubscription = {
	properties: string[];
	userId: Id;
	userRole: AccessRole;
};

export abstract class SubscribableActor<
	Entity extends Document & { updated: Timestamp },
	Message,
	Result,
> extends StoringActor<Entity, Message, Result> {
	private checkOldClientsInterval: NodeJS.Timeout;

	protected abstract override state: {
		cache: Map<Id, Entity>;
		lastTouched: Map<Id, Timestamp>;
		subscribers: Map<Id, Set<ActorUri>>;
		collectionSubscribers: Map<ActorUri, CollecionSubscription>;
		lastSeen: Map<ActorUri, Timestamp>;
	};

	public constructor(name: string, system: ActorSystem, collectionName: string) {
		super(name, system, collectionName);
		this.checkOldClientsInterval = setInterval(this.checkOldClients, CHECK_TIME.valueOf());
	}

	public override async beforeShutdown(): Promise<void> {
		super.beforeShutdown();
		clearInterval(this.checkOldClientsInterval);
	}

	private checkOldClients = async () => {
		const oldClients: ActorUri[] = await this.ask(createActorUri("ErrorActor"), new GetClosedClientList());
		console.log("CHECKOLD", oldClients);
		this.state = create(this.state, draft => {
			const removedSubscribers = new Set<ActorUri>();
			oldClients.forEach(key => {
				draft.collectionSubscribers.delete(key);
				removedSubscribers.add(key);
			});
			for (const entity in draft.subscribers.keys()) {
				const subscriberSet = draft.subscribers.get(entity as Id)!;
				const toDelete = Array.from(subscriberSet).filter(uri => oldClients.includes(uri));
				toDelete.forEach(rs => {
					subscriberSet.delete(rs);
					removedSubscribers.add(rs);
				});
			}
			removedSubscribers.forEach(rs => draft.lastSeen.delete(rs));
			return;
		});
	};

	protected override cleanup() {
		super.cleanup();

		const cleanupTimestamp = DateTime.utc().minus(CLEANUP_INTERVAL);
		// Remove all old subscriptions
		this.state = create(this.state, draft => {
			const isOld = (s: ActorUri) => fromTimestamp(draft.lastSeen.get(s) ?? toTimestamp()) < cleanupTimestamp;
			const removedSubscribers = new Set<ActorUri>();
			// Remove old collection subscribers
			const oldCollectionSubscribers = Array.from(draft.collectionSubscribers.keys()).filter(isOld);
			oldCollectionSubscribers.forEach(ogs => {
				draft.collectionSubscribers.delete(ogs);
				removedSubscribers.add(ogs);
			});
			// For each individual subscriber
			for (const entity in draft.subscribers.keys()) {
				const subscriberSet = draft.subscribers.get(entity as Id)!;
				const toDelete = Array.from(subscriberSet).filter(isOld);
				toDelete.forEach(rs => {
					subscriberSet.delete(rs);
					removedSubscribers.add(rs);
				});
			}
			// Remove the lastSeen entries of all deleted subscribers
			removedSubscribers.forEach(rs => draft.lastSeen.delete(rs));
		});
	}
}
