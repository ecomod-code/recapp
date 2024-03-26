import { Timestamp, Unit, fromTimestamp, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { maybe, nothing } from "tsmonads";
import { Id, Session, SessionStoreMessage, SessionStoreMessages } from "@recapp/models";
import { identity } from "rambda";
import { StoringActor } from "./StoringActor";

type SessionStoreResult = Unit | Error | Session | boolean;

type SessionStoreState = {
	cache: Map<Id, Session>;
	clientIndex: Map<string, Id>;
	lastTouched: Map<Id, Timestamp>;
};

export class SessionStore extends StoringActor<Session, SessionStoreMessage, SessionStoreResult> {
	protected override state: SessionStoreState = { cache: new Map(), clientIndex: new Map(), lastTouched: new Map() };

	public constructor(name: string, system: ActorSystem) {
		super(name, system, "sessions");
	}

	protected override updateIndices(draft: SessionStoreState, entity: Session): void {
		if (entity.actorSystem) {
			draft.clientIndex.set(entity.actorSystem, entity.uid);
		}
	}

	private sessionValid = (session: Session, client?: Id) => {
		if (session.refreshExpires.value > toTimestamp().value) {
			return maybe(session);
		}
		this.logger.warn(
			`Accessed session ${session.uid} that expired ${fromTimestamp(session.refreshExpires).toISO()} < ${fromTimestamp(toTimestamp()).toISO()}`
		);
		if (client) {
			this.send(`actors://${client}/ErrorActor`, {
				ErrorMessage: "SetError",
				value: { message: "Session expired" },
			});
		}
		this.send(this.actorRef!, SessionStoreMessages.RemoveSession(session.uid));
		return nothing();
	};

	public async receive(from: ActorRef, message: SessionStoreMessage): Promise<SessionStoreResult> {
		const result = await SessionStoreMessages.match<Promise<SessionStoreResult>>(message, {
			StoreSession: async session => {
				this.state = await create(this.state, async draft => {
					const currentSession = (await this.getEntity(session.uid)).orElse({} as Session);
					if (session.actorSystem) {
						draft.clientIndex.set(session.actorSystem, session.uid);
					}
					session.updated = toTimestamp();
					const newSession = { ...currentSession, ...session };
					draft.cache.set(session.uid, newSession);
					this.storeEntity(newSession);
				});
				return unit();
			},
			CheckSession: async userId => {
				const session = await this.getEntity(userId);
				return session
					.flatMap(s => this.sessionValid(s))
					.match(
						() => true,
						() => false
					);
			},
			GetSessionForUserId: async userId => {
				const session = (await this.getEntity(userId)).flatMap(s => this.sessionValid(s));
				return session.match<Session | Error>(identity, () => new Error(`Unknown user id ${userId}`));
			},
			GetSessionForClient: async client => {
				const maybeUserId = maybe(this.state.clientIndex.get(client));
				return await maybeUserId.match(
					async userId => {
						const maybeSession = (await this.getEntity(userId)).flatMap(s => this.sessionValid(s, client));
						return maybeSession.match<Session | Error>(identity, () => new Error("Unknown client session"));
					},
					async () => new Error("Unknown client session")
				);
			},
			RemoveSession: async userId => {
				this.state = await create(this.state, async draft => {
					const maybeSession = await this.getEntity(userId);
					maybeSession.forEach(session => {
						if (session.actorSystem) {
							draft.clientIndex.delete(session.actorSystem);
						}
					});
					draft.cache.delete(userId);
				});
				return this.deleteEntity(userId);
			},
			default: async () => new Error(`Unknown message from ${from.name}`),
		});
		return result;
	}
}
