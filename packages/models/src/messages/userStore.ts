import { unionize, ofType, UnionOf } from "unionize";
import { Id } from "../data/base";
import { User, UserRole } from "../data/user";

export const UserStoreMessages = unionize(
	{
		Create: ofType<User>(), // Create a new user
		Update: ofType<Partial<User> & { uid: Id }>(), // Update user data, answers updated User
		Has: ofType<Id>(), // Whether the user exists, answers boolean
		Find: ofType<{ query: string; role: UserRole }>(), // FInd a user matching the given nickname, id oder email, returns the user id if found
		GetAll: {}, // Request all users accessible by the requester, users will be returned in UserUpdateMessages to the sender
		Get: ofType<Id>(), // Get user, answers with User
		GetOwn: {}, // Return the info of the requesting user, answers with User
		GetRole: ofType<Id>(), // Return the role of the given user, answers with UserRole
		SubscribeTo: ofType<Id>(), // Subscribe to all changes of the specific user, sends back all updates to requester
		SubscribeToCollection: ofType<string[]>(), // Subscribe to all changes of the specific user, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFrom: ofType<Id>(), // Unsubscribe from a specific user's changes
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
		GetTeachers: {}, // Returns a list of minimal information on all teachers (uid, name, pseudonym)
		IsNicknameUnique: ofType<string>(), // Returns a boolean to signal whether the given pseudonym is unique. Note that you should not test for the user's own nickname since this will always be false
	},
	{ tag: "UserStoreMessage", value: "value" }
);

/** Message send to the client on user subscriptions */
export class UserUpdateMessage {
	public readonly tag = "UserUpdateMessage" as const;
	constructor(public readonly user: Partial<User>) {}
}

export type UserStoreMessage = UnionOf<typeof UserStoreMessages>;
