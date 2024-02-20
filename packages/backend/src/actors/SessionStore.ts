import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { unionize, ofType, UnionOf } from "unionize";
import { create } from "mutative";
import { maybe, nothing } from "tsmonads";
import { Id, UserRole } from "@recapp/models";
import { identity } from "rambda";
import { StoringActor } from "./StoringActor";

export type Session = {
	idToken: string;
	accessToken: string;
	refreshToken: string;
	uid: Id;
	expires: Timestamp;
	actorSystem: string;
	role: UserRole;
	created: Timestamp;
	updated: Timestamp;
};

export const SessionStoreMessages = unionize(
	{
		StoreSession: ofType<Partial<Session> & { uid: Id }>(), // Store the session; also removed older sessions of the user
		CheckSession: ofType<Id>(), // Checks whether the session of the actor is valid
		GetSessionForUserId: ofType<Id>(), // Returns the session for the given userId
		GetSessionForClient: ofType<Id>(), // Returns the session for the given client actor system
		RemoveSession: ofType<Id>(), // Invalidates the session (e.g. when user has logged out)
	},
	{ tag: "SessionStoreMessages", value: "value" }
);

export type SessionStoreMessage = UnionOf<typeof SessionStoreMessages>;

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

	private sessionValid = (session: Session) => {
		if (session.expires.value > toTimestamp().value) {
			return maybe(session);
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
					const newSession = { ...currentSession, ...session };
					draft.cache.set(session.uid, newSession);
					this.storeEntity(newSession);
				});
				return unit();
			},
			CheckSession: async userId => {
				const session = await this.getEntity(userId);
				return session.flatMap(this.sessionValid).match(
					() => true,
					() => false
				);
			},
			GetSessionForUserId: async userId => {
				const session = (await this.getEntity(userId)).flatMap(this.sessionValid);
				return session.match<Session | Error>(identity, () => new Error("Unknown user id"));
			},
			GetSessionForClient: async client => {
				const maybeUserId = maybe(this.state.clientIndex.get(client));
				return await maybeUserId.match(
					async userId => {
						const maybeSession = (await this.getEntity(userId)).flatMap(this.sessionValid);
						return maybeSession.match<Session | Error>(identity, () => new Error("Unknown client session"));
					},
					async () => new Error("Unknown client session")
				);
			},
			RemoveSession: async userId => {
				this.state = await create(this.state, async draft => {
					const maybeSession = await this.getEntity(userId);
					maybeSession.map(session => {
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
