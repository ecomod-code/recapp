import {
	ActorUri,
	Id,
	User,
	UserRole,
	UserStoreMessage,
	UserStoreMessages,
	UserUpdateMessage,
	uidSchema,
	userSchema,
} from "@recapp/models";
import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { identity, pick } from "rambda";
import { SubscribableActor } from "./SubscribableActor";
import { AccessRole } from "./StoringActor";

type ListedUser = Omit<User, "quizUsage">;

type ResultType = User | ListedUser[] | Error | Unit | UserRole | boolean;

type State = {
	cache: Map<Id, User>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, string[]>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
};

export class UserStore extends SubscribableActor<User, UserStoreMessage, ResultType> {
	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
	};

	public constructor(name: string, system: ActorSystem) {
		super(name, system, "users");
	}

	protected override updateIndices(_draft: State, _user: User): void {
		return;
	}

	public async receive(from: ActorRef, message: UserStoreMessage): Promise<ResultType> {
		try {
			const [clientUserRole, clientUserId] = await this.determineRole(from);
			return await UserStoreMessages.match<Promise<ResultType>>(message, {
				CreateUser: async user => {
					const validation = userSchema.safeParse(user);
					if (!validation.success) {
						return new Error(validation.error.toString());
					}
					const userToStore = validation.data;
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
						return new Error(`Operation not allowed`);
					}
					if (this.state.cache.has(userToStore.uid)) {
						return new Error(`User id ${user.uid} already exists`);
					}
					const db = await this.connector.db();
					const noOfUsers = await db.collection<User>(this.collectionName).countDocuments();
					if (noOfUsers === 0) {
						// The first user will always be an admin
						userToStore.role = "ADMIN";
					}
					this.state = create(this.state, draft => {
						draft.cache.set(userToStore.uid, userToStore);
					});
					for (const [subscriber, properties] of this.state.collectionSubscribers) {
						this.send(subscriber, new UserUpdateMessage(pick(properties, userToStore)));
					}
					for (const subscriber of this.state.subscribers.get(userToStore.uid) ?? new Set()) {
						this.send(subscriber, new UserUpdateMessage(userToStore));
					}
					return await this.storeEntity(user)
						.then(() => unit())
						.catch(error => error as Error);
				},
				UpdateUser: async user => this.updateUser(user, clientUserRole, clientUserId),
				HasUser: async userId => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
						return new Error(
							`Operation not allowed for ${clientUserRole} and ${clientUserId} on ${userId}`
						);
					}
					const maybeUser = await this.getEntity(userId);
					return maybeUser.hasValue;
				},
				GetOwnUser: async () => {
					const maybeUser = await this.getEntity(clientUserId);
					return maybeUser.match<User | Error>(
						identity,
						() => new Error(`User id ${clientUserId} does not exist`)
					);
				},
				GetUser: async userId => {
					if (!["ADMIN", "SYSTEM", "TEACHER"].includes(clientUserRole) && userId !== clientUserId) {
						return new Error(`Operation not allowed`);
					}
					const maybeUser = await this.getEntity(userId);
					return maybeUser.match<User | Error>(identity, () => new Error(`User id ${userId} does not exist`));
				},
				GetUsers: async () => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
						return new Error(`Operation not allowed`);
					}
					const db = await this.connector.db();
					const users = await db.collection<User>(this.collectionName).find().toArray();
					users.forEach(user => {
						const { _id, quizUsage, ...rest } = user;
						this.send(from, new UserUpdateMessage(rest));
					});
					return unit();
				},
				GetRole: async userId => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
						return new Error(`Operation not allowed`);
					}
					const maybeUser = await this.getEntity(userId);
					return maybeUser.match<UserRole | Error>(
						user => user.role,
						() => new Error(`User id ${userId} does not exist`)
					);
				},
				SubscribeToUser: async userId => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
						return new Error(`Operation not allowed`);
					}
					this.state = create(this.state, draft => {
						const subscribers = draft.subscribers.get(userId) ?? new Set();
						subscribers.add(from.name as ActorUri);
						draft.subscribers.set(userId, subscribers);
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
					});
					return unit();
				},
				SubscribeToUserCollection: async (requestedProperties: string[]) => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
						return new Error(`Operation not allowed`);
					}
					this.state = create(this.state, draft => {
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						draft.collectionSubscribers.set(from.name as ActorUri, requestedProperties);
					});
					return unit();
				},
				UnsubscribeToUser: async userId => {
					this.state = create(this.state, draft => {
						const subscribers = draft.subscribers.get(userId) ?? new Set();
						subscribers.delete(from.name as ActorUri);
						draft.subscribers.set(userId, subscribers);
					});
					return unit();
				},
				UnsubscribeToUserCollection: async () => {
					this.state = create(this.state, draft => {
						draft.collectionSubscribers.delete(from.name as ActorUri);
					});
					return unit();
				},
				default: async () => {
					return new Error(`Unknown message ${JSON.stringify(message)} from ${from.name}`);
				},
			});
		} catch (e) {
			console.error(from, message, e);
			throw e;
		}
	}

	private updateUser = async (
		user: Partial<User> & { uid: Id },
		clientUserRole: AccessRole,
		clientUserId: Id
	): Promise<User | Error> => {
		const validation = userSchema.partial().extend({ uid: uidSchema }).safeParse(user);
		if (!validation.success) {
			return new Error(validation.error.toString());
		}
		const userToStore = validation.data;
		delete userToStore.created;
		if (!["ADMIN", "SYSTEM", "TEACHER"].includes(clientUserRole) && userToStore.uid !== clientUserId) {
			return new Error(`Operation not allowed`);
		}
		if (userToStore.uid === clientUserId) {
			// Users can never (de)activate or archive themselves
			delete userToStore.active;
			delete userToStore.archived;
			delete userToStore.lastLogin;
		} else if (clientUserRole !== "SYSTEM") {
			delete userToStore.lastLogin;
			if (clientUserRole !== "ADMIN") {
				delete userToStore.role;
				delete userToStore.archived;
				delete userToStore.active;
			}
		}
		const oldUser = (await this.getEntity(userToStore.uid)).orUndefined();
		if (!oldUser) {
			return new Error(`User id ${userToStore.uid} does not exist`);
		}
		let newUser!: User;
		this.state = create(this.state, draft => {
			newUser = { ...oldUser, ...userToStore } as User;
			draft.cache.set(userToStore.uid, newUser);
			for (const [subscriber, properties] of this.state.collectionSubscribers) {
				this.send(subscriber, new UserUpdateMessage(pick(properties, newUser)));
				draft.lastSeen.set(subscriber, toTimestamp());
			}
			for (const subscriber of this.state.subscribers.get(userToStore.uid) ?? new Set()) {
				this.send(subscriber, new UserUpdateMessage(newUser));
				draft.lastSeen.set(subscriber, toTimestamp());
			}
		});
		return this.storeEntity(newUser)
			.then(() => newUser)
			.catch(error => error as Error);
	};
}
