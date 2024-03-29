import { unionize, ofType, UnionOf } from "unionize";
import { Session } from "../data/session";
import { Id } from "../data/base";

export const SessionStoreMessages = unionize(
	{
		Ping: {}, // Keep alive from client systems
		StoreSession: ofType<Partial<Session> & { uid: Id }>(), // Store the session; also removed older sessions of the user
		CheckSession: ofType<Id>(), // Checks whether the session of the actor is valid, sends back a boolean
		GetSessionForUserId: ofType<Id>(), // Returns the session for the given userId, sends back a Session
		GetSessionForClient: ofType<Id>(), // Returns the session for the given client actor system, sends back a Session
		RemoveSession: ofType<Id>(), // Invalidates the session (e.g. when user has logged out)
	},
	{ tag: "SessionStoreMessages", value: "value" }
);

export type SessionStoreMessage = UnionOf<typeof SessionStoreMessages>;
