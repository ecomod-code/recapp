import { ActorUri, Id, User, UserRole } from "@recapp/models";
import { Unit, unit } from "itu-utils";
import { Actor, ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { unionize, ofType, UnionOf } from "unionize";
import { maybe } from "tsmonads";
import { identity } from "rambda";
import { createActorUri, extractSystemName, systemEquals } from "../utils";
import { Session, SessionStoreMessages } from "./SessionStore";

export const UserStoreMessages = unionize(
	{
		CreateUser: ofType<User>(),
		UpdateUser: ofType<Partial<User> & { uid: Id }>(),
		HasUser: ofType<Id>(),
		GetUser: ofType<Id>(),
		GetOwnUser: {},
		GetRole: ofType<Id>(),
		SubscribeToUser: ofType<Id>(),
		SubscribeToUserCollection: {},
		UnsubscribeToUser: ofType<Id>(),
		UnsubscribeToUserCollection: {},
	},
	{ tag: "UserStoreMessage", value: "value" }
);

export class UserUpdateMessage {
	public readonly type = "UserUpdateMessage" as const;
	constructor(public readonly user: User) {}
}

export type UserStoreMessage = UnionOf<typeof UserStoreMessages>;

type ResultType = User | Error | Unit | UserRole | boolean;

type State = {
	users: Map<Id, User>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Set<ActorUri>;
};

type AccessRole = UserRole | "SYSTEM";

export class UserStore extends Actor<UserStoreMessage, ResultType> {
	private state: State = { users: new Map(), subscribers: new Map(), collectionSubscribers: new Set() };

	public constructor(name: string, system: ActorSystem) {
		super(name, system);
	}

	private determineRole = async (from: ActorRef): Promise<[AccessRole, Id]> => {
		if (systemEquals(this.actorRef!, from)) {
			return ["SYSTEM", "SYSTEM" as Id];
		}

		const session: Session = await this.ask(
			createActorUri("SessionStore"),
			SessionStoreMessages.GetSessionForClient(extractSystemName(from.name))
		);
		return [session.role, session.userId];
	};

	public async receive(from: ActorRef, message: UserStoreMessage): Promise<ResultType> {
		const [clientUserRole, clientUserId] = await this.determineRole(from);
		return UserStoreMessages.match<ResultType>(message, {
			CreateUser: user => {
				if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
					return new Error(`Operation not allowed`);
				}
				if (this.state.users.has(user.uid)) {
					return new Error(`User id ${user.uid} already exists`);
				}
				this.state = create(this.state, draft => {
					draft.users.set(user.uid, user);
				});
				for (const subscriber in this.state.collectionSubscribers) {
					this.send(subscriber, new UserUpdateMessage(user));
				}
				for (const subscriber in this.state.subscribers.get(user.uid) ?? new Set()) {
					this.send(subscriber, new UserUpdateMessage(user));
				}

				return unit();
			},
			UpdateUser: user => this.updateUser(user, clientUserRole, clientUserId),
			HasUser: userId => {
				if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
					return new Error(`Operation not allowed`);
				}
				const maybeUser = maybe(this.state.users.get(userId));
				return maybeUser.hasValue;
			},
			GetOwnUser: () => {
				const maybeUser = maybe(this.state.users.get(clientUserId));
				return maybeUser.match<User | Error>(
					identity,
					() => new Error(`User id ${clientUserId} does not exist`)
				);
			},
			GetUser: userId => {
				if (!["ADMIN", "SYSTEM", "TEACHER"].includes(clientUserRole) && userId !== clientUserId) {
					return new Error(`Operation not allowed`);
				}
				const maybeUser = maybe(this.state.users.get(userId));
				return maybeUser.match<User | Error>(identity, () => new Error(`User id ${userId} does not exist`));
			},
			GetRole: userId => {
				if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
					return new Error(`Operation not allowed`);
				}
				const maybeUser = maybe(this.state.users.get(userId));
				return maybeUser.match<UserRole | Error>(
					user => user.role,
					() => new Error(`User id ${userId} does not exist`)
				);
			},
			SubscribeToUser: userId => {
				if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
					return new Error(`Operation not allowed`);
				}
				this.state = create(this.state, draft => {
					const subscribers = draft.subscribers.get(userId) ?? new Set();
					subscribers.add(from.name as ActorUri);
					draft.subscribers.set(userId, subscribers);
				});
				return unit();
			},
			SubscribeToUserCollection: () => {
				if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
					return new Error(`Operation not allowed`);
				}
				this.state = create(this.state, draft => {
					draft.collectionSubscribers.add(from.name as ActorUri);
				});
				return unit();
			},
			UnsubscribeToUser: userId => {
				this.state = create(this.state, draft => {
					const subscribers = draft.subscribers.get(userId) ?? new Set();
					subscribers.delete(from.name as ActorUri);
					draft.subscribers.set(userId, subscribers);
				});
				return unit();
			},
			UnsubscribeToUserCollection: () => {
				this.state = create(this.state, draft => {
					draft.collectionSubscribers.delete(from.name as ActorUri);
				});
				return unit();
			},
			default: () => {
				return new Error(`Unknown message ${JSON.stringify(message)} from ${from.name}`);
			},
		});
	}

	private updateUser = (
		user: Partial<User> & { uid: Id },
		clientUserRole: AccessRole,
		clientUserId: Id
	): User | Error => {
		delete user.created;
		if (!["ADMIN", "SYSTEM", "TEACHER"].includes(clientUserRole) && user.uid !== clientUserId) {
			return new Error(`Operation not allowed`);
		}
		if (user.uid === clientUserId) {
			// Users can never (de)activate or archive themselves
			delete user.active;
			delete user.archived;
			delete user.lastLogin;
		} else if (clientUserRole !== "SYSTEM") {
			delete user.lastLogin;
			if (clientUserRole !== "ADMIN") {
				delete user.role;
				delete user.archived;
				delete user.active;
			}
		}
		if (!this.state.users.has(user.uid)) {
			return new Error(`User id ${user.uid} does not exist`);
		}
		let newUser!: User;
		this.state = create(this.state, draft => {
			const oldUser = draft.users.get(user.uid)!;
			newUser = { ...oldUser, ...user };
			draft.users.set(user.uid, newUser);
		});
		for (const subscriber in this.state.collectionSubscribers) {
			this.send(subscriber, new UserUpdateMessage(newUser));
		}
		for (const subscriber in this.state.subscribers.get(user.uid) ?? new Set()) {
			this.send(subscriber, new UserUpdateMessage(newUser));
		}

		return newUser;
	};
}
