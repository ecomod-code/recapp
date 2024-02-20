import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { Actor, ActorRef, ActorSystem } from "ts-actors";
import { unionize, ofType, UnionOf } from "unionize";
import { create } from "mutative";
import { maybe, nothing } from "tsmonads";
import { Id, UserRole } from "@recapp/models";
import { identity } from "rambda";

export type Session = {
	idToken: string;
	accessToken: string;
	refreshToken: string;
	userId: Id;
	expires: Timestamp;
	actorSystem: string;
	role: UserRole;
};

export const SessionStoreMessages = unionize(
	{
		StoreSession: ofType<Partial<Session> & { userId: Id }>(), // Store the session; also removed older sessions of the user
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
	sessions: Map<Id, Session>;
	clientIndex: Map<string, Id>;
};

export class SessionStore extends Actor<SessionStoreMessage, SessionStoreResult> {
	private state: SessionStoreState = { sessions: new Map(), clientIndex: new Map() };

	public constructor(name: string, system: ActorSystem) {
		super(name, system);
	}

	private sessionValid = (session: Session) => {
		if (session.expires > toTimestamp()) {
			return maybe(session);
		}

		this.send(this.actorRef!, SessionStoreMessages.RemoveSession(session.userId));
		return nothing();
	};

	public async receive(from: ActorRef, message: SessionStoreMessage): Promise<SessionStoreResult> {
		const result = SessionStoreMessages.match<SessionStoreResult>(message, {
			StoreSession: session => {
				this.state = create(this.state, draft => {
					const currentSession = draft.sessions.get(session.userId) ?? ({} as Session);
					if (session.actorSystem) {
						draft.clientIndex.set(session.actorSystem, session.userId);
					}
					draft.sessions.set(session.userId, { ...currentSession, ...session });
				});
				return unit();
			},
			CheckSession: userId => {
				const session = maybe(this.state.sessions.get(userId)).flatMap(this.sessionValid);
				return session.match(
					() => true,
					() => false
				);
			},
			GetSessionForUserId: userId => {
				const session = maybe(this.state.sessions.get(userId)).flatMap(this.sessionValid);
				return session.match<Session | Error>(identity, () => new Error("Unknown user id"));
			},
			GetSessionForClient: client => {
				const session = maybe(this.state.clientIndex.get(client))
					.flatMap(userId => maybe(this.state.sessions.get(userId)))
					.flatMap(this.sessionValid);
				return session.match<Session | Error>(identity, () => new Error("Unknown client session"));
			},
			RemoveSession: userId => {
				this.state = create(this.state, draft => {
					draft.sessions.delete(userId);
				});
				return unit();
			},
			default: () => new Error(`Unknown message from ${from.name}`),
		});
		return result;
	}
}
