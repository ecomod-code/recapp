import {
	ActorUri,
	Id,
	Session,
	SessionStoreMessages,
	User,
	UserRole,
	UserStoreMessage,
	UserStoreMessages,
	UserUpdateMessage,
	toId,
	uidSchema,
	userSchema,
} from "@recapp/models";
import { Timestamp, Unit, toTimestamp, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { create } from "mutative";
import { identity, pick } from "rambda";
import { SubscribableActor } from "./SubscribableActor";
import { AccessRole } from "./StoringActor";
import { maybe } from "tsmonads";
import { createActorUri } from "../utils";

type ListedUser = Omit<User, "quizUsage">;

type Teacher = Pick<User, "uid" | "nickname" | "username">;

type ResultType = User | ListedUser[] | Teacher[] | Error | Unit | UserRole | boolean | Id;

type State = {
	cache: Map<Id, User>;
	subscribers: Map<Id, Set<ActorUri>>;
	collectionSubscribers: Map<ActorUri, string[]>;
	lastSeen: Map<ActorUri, Timestamp>;
	lastTouched: Map<Id, Timestamp>;
	nicknames: Set<string>; // Index of all nicknames
	teachers: Map<Id, Teacher>; // Index of all teachers and admins
};

export class UserStore extends SubscribableActor<User, UserStoreMessage, ResultType> {
	protected override state: State = {
		cache: new Map(),
		subscribers: new Map(),
		collectionSubscribers: new Map(),
		lastSeen: new Map(),
		lastTouched: new Map(),
		nicknames: new Set(),
		teachers: new Map(),
	};

	public constructor(name: string, system: ActorSystem) {
		super(name, system, "users");
	}

	public override async afterStart(): Promise<void> {
		const db = await this.connector.db();
		const users = (await db
			.collection<User>(this.collectionName)
			.find({}, { uid: 1, username: 1, nickname: 1 } as any)
			.toArray()) as Teacher[];
		this.state.nicknames = new Set(users.map(u => u.nickname).filter(Boolean) as string[]);
		this.state.teachers = new Map(users.map(u => [u.uid, u]));
	}

	protected override updateIndices(draft: State, user: User): void {
		maybe(user.nickname).forEach(draft.nicknames.add);
		draft.teachers.set(user.uid, { uid: user.uid, username: user.username, nickname: user.nickname });
	}

	public async receive(from: ActorRef, message: UserStoreMessage): Promise<ResultType> {
		console.log("USERSTORE", from.name, message);
		try {
			const [clientUserRole, clientUserId] = await this.determineRole(from);
			const result = await UserStoreMessages.match<Promise<ResultType>>(message, {
				Create: async user => {
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
						this.send(
							subscriber,
							new UserUpdateMessage(properties.length > 0 ? pick(properties, userToStore) : userToStore)
						);
					}
					for (const subscriber of this.state.subscribers.get(userToStore.uid) ?? new Set()) {
						this.send(subscriber, new UserUpdateMessage(userToStore));
					}
					return await this.storeEntity(user)
						.then(() => unit())
						.catch(error => error as Error);
				},
				Update: async user => this.updateUser(user, clientUserRole, clientUserId),
				Has: async userId => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole) && userId !== clientUserId) {
						return new Error(
							`Operation not allowed for ${clientUserRole} and ${clientUserId} on ${userId}`
						);
					}
					const maybeUser = await this.getEntity(userId);
					return maybeUser.hasValue;
				},
				GetOwn: async () => {
					const maybeUser = await this.getEntity(clientUserId);
					return maybeUser.match<User | Error>(
						identity,
						() => new Error(`User id ${clientUserId} does not exist`)
					);
				},
				Get: async userId => {
					if (!["ADMIN", "SYSTEM", "TEACHER"].includes(clientUserRole) && userId !== clientUserId) {
						return new Error(`Operation not allowed`);
					}
					const maybeUser = await this.getEntity(userId);
					return maybeUser.match<User | Error>(identity, () => new Error(`User id ${userId} does not exist`));
				},
				GetAll: async () => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
						return new Error(`Operation not allowed`);
					}
					const db = await this.connector.db();
					const users = await db.collection<User>(this.collectionName).find({}).toArray();
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
				SubscribeTo: async userId => {
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
				SubscribeToCollection: async (requestedProperties: string[]) => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
						return new Error(`Operation not allowed`);
					}
					this.state = create(this.state, draft => {
						draft.lastSeen.set(from.name as ActorUri, toTimestamp());
						draft.collectionSubscribers.set(from.name as ActorUri, requestedProperties);
					});
					return unit();
				},
				UnsubscribeFrom: async userId => {
					this.state = create(this.state, draft => {
						const subscribers = draft.subscribers.get(userId) ?? new Set();
						subscribers.delete(from.name as ActorUri);
						draft.subscribers.set(userId, subscribers);
					});
					return unit();
				},
				UnsubscribeFromCollection: async () => {
					this.state = create(this.state, draft => {
						draft.collectionSubscribers.delete(from.name as ActorUri);
					});
					return unit();
				},
				GetTeachers: async () => {
					if (!["ADMIN", "SYSTEM"].includes(clientUserRole)) {
						return new Error(`Operation not allowed`);
					}
					return Array.from(this.state.teachers.values());
				},
				IsNicknameUnique: async nickname => {
					return !this.state.nicknames.has(nickname);
				},
				Find: async ({ query, role }) => {
					const db = await this.connector.db();
					const users = await db.collection<User>(this.collectionName).find({}).toArray();
					const user = users.find(u => u.nickname === query || u.uid === query);
					console.log(user, users);
					if (user) {
						if (role === "STUDENT") {
							return user.uid;
						} else if (user.role !== "STUDENT") {
							return user.uid;
						}
					}
					return toId("");
				},
				default: async () => {
					return new Error(`Unknown message ${JSON.stringify(message)} from ${from.name}`);
				},
			});
			console.log("To ", from.name, result);
			return result;
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
			delete userToStore.role;
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
			newUser.updated = toTimestamp();
			draft.cache.set(userToStore.uid, newUser);

			// If the role has changed, also update the session store
			if (oldUser.role !== newUser.role) {
				(
					this.ask(
						createActorUri("SessionStore"),
						SessionStoreMessages.GetSessionForUserId(newUser.uid)
					) as Promise<Session>
				).then((session: Session) => {
					session.role = newUser.role;
					this.send(createActorUri("SessionStore"), SessionStoreMessages.StoreSession(session));
				});
			}

			for (const [subscriber, properties] of this.state.collectionSubscribers) {
				this.send(
					subscriber,
					new UserUpdateMessage(properties.length > 0 ? pick(properties, newUser) : newUser)
				);
				draft.lastSeen.set(subscriber, toTimestamp());
			}
			for (const subscriber of this.state.subscribers.get(userToStore.uid) ?? new Set()) {
				this.send(subscriber, new UserUpdateMessage(newUser));
				draft.lastSeen.set(subscriber, toTimestamp());
			}
		});
		console.log("Updated user", newUser);
		return this.storeEntity(newUser)
			.then(() => newUser)
			.catch(error => error as Error);
	};
}
