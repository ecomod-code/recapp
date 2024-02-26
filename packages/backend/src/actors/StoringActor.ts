import { Id, Session, SessionStoreMessages, UserRole } from "@recapp/models";
import { Actor, ActorRef, ActorSystem } from "ts-actors";
import Container from "typedi";
import { DbClient } from "../DbClient";
import { Maybe, maybe } from "tsmonads";
import { Document } from "mongodb";
import { Draft, create } from "mutative";
import { Timestamp, Unit, fromTimestamp, hours, toTimestamp, unit } from "itu-utils";
import { DateTime } from "luxon";
import { systemEquals, createActorUri, extractSystemName } from "../utils";

export const CLEANUP_INTERVAL = 2; // When to cleanup old entries

export type AccessRole = UserRole | "SYSTEM";

export abstract class StoringActor<Entity extends Document & { updated: Timestamp }, Message, Result> extends Actor<
	Message,
	Result
> {
	private checkInterval: NodeJS.Timeout;
	protected readonly connector = Container.get(DbClient);
	protected abstract state: { cache: Map<Id, Entity>; lastTouched: Map<Id, Timestamp> };

	public constructor(
		name: string,
		system: ActorSystem,
		protected readonly collectionName: string
	) {
		super(name, system);
		this.checkInterval = setInterval(this.cleanup.bind(this), hours(CLEANUP_INTERVAL).valueOf());
	}

	public override async afterStart(): Promise<void> {
		this.logger.debug("Storing actor initiallized");
	}

	public override async beforeShutdown(): Promise<void> {
		clearInterval(this.checkInterval);
	}

	protected determineRole = async (from: ActorRef): Promise<[AccessRole, Id]> => {
		if (systemEquals(this.actorRef!, from)) {
			return ["SYSTEM", "SYSTEM" as Id];
		}
		if (extractSystemName(this.actorRef!.name) === from.name.replace("actors://", "")) {
			// It's our actor system that's asking directly
			return ["SYSTEM", "SYSTEM" as Id];
		}

		const session: Session = await this.ask(
			createActorUri("SessionStore"),
			SessionStoreMessages.GetSessionForClient(extractSystemName(from.name))
		);
		return [session.role, session.uid];
	};

	protected cleanup() {
		this.logger.debug(`Running cache and subscription cleanups for ${this.name}`);
		const cleanupTimestamp = DateTime.utc().minus(hours(CLEANUP_INTERVAL));

		// Clear old entries from cache to save memory
		this.state = create(this.state, draft => {
			const isOld = (entity: Id) =>
				fromTimestamp(draft.lastTouched.get(entity) ?? toTimestamp()) < cleanupTimestamp;
			const entitiesToRemove = Array.from(draft.cache.keys()).filter(isOld);
			entitiesToRemove.forEach(e => {
				draft.lastTouched.delete(e);
				draft.cache.delete(e);
			});
		});
	}

	protected abstract updateIndices(draft: { cache: Map<Id, Entity> }, entity: Entity): void;

	protected getEntity = async (uid: Id): Promise<Maybe<Entity>> => {
		const maybeEntity = maybe(this.state.cache.get(uid));
		const result = await maybeEntity.match(
			entity => Promise.resolve(maybe(entity)),
			async () => {
				const db = await this.connector.db();
				const entity = await db.collection<Entity>(this.collectionName).findOne({ uid });
				return maybe(entity as Entity | null).map(e => {
					this.state = create(this.state, draft => {
						const currentEntity = draft.cache.get(uid) ?? ({} as Entity);
						this.updateIndices(draft as { cache: Map<Id, Entity> }, e);
						draft.cache.set(uid, { ...currentEntity, ...e } as Draft<Entity>);
					});
					return this.state.cache.get(uid)!;
				});
			}
		);
		this.state = create(this.state, draft => {
			draft.lastTouched.set(uid, toTimestamp());
		});
		return result;
	};

	protected storeEntity = async (entity: Entity): Promise<Entity> => {
		if (!entity.updated) {
			entity.updated = toTimestamp();
		}
		// this.logger.debug("Storing new entity " + JSON.stringify(entity));
		const db = await this.connector.db();
		const result = await db
			.collection<Entity>(this.collectionName)
			.updateOne({ uid: entity.uid }, { $set: entity }, { upsert: true });
		if (result.upsertedCount === 1 || result.modifiedCount === 1) {
			return entity;
		}
		this.state = create(this.state, draft => {
			draft.lastTouched.set(entity.uid, toTimestamp());
		});
		throw new Error("FATAL: Storing a session failed");
	};

	protected deleteEntity = async (uid: Id): Promise<Unit> => {
		const db = await this.connector.db();
		await db.collection<Entity>(this.collectionName).deleteOne({ uid });
		return unit();
	};
}
