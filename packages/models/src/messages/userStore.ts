import { unionize, ofType, UnionOf } from "unionize";
import { Id } from "../data/base";
import { User } from "../data/user";

export const UserStoreMessages = unionize(
	{
		CreateUser: ofType<User>(), // Create a new user
		UpdateUser: ofType<Partial<User> & { uid: Id }>(), // Update user data, answers updated User
		HasUser: ofType<Id>(), // Whether the user exists, answers boolean
		GetUsers: {}, // Get all users accessible by the requester, will send back all users in this list to the requester
		GetUser: ofType<Id>(), // Get user, answers with User
		GetOwnUser: {}, // Return the info of the requesting user, answers with User
		GetRole: ofType<Id>(), // Return the role of the given user, answers with UserRole
		SubscribeToUser: ofType<Id>(), // Subscribe to all changes of the specific user, sends back all updates to requester
		SubscribeToUserCollection: ofType<string[]>(), // Subscribe to all changes of the specific user, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeToUser: ofType<Id>(), // Unsubscribe from a specific user's changes
		UnsubscribeToUserCollection: {}, // Unsubscribe from collection changes
	},
	{ tag: "UserStoreMessage", value: "value" }
);

/** Message send to the client on user subscriptions */
export class UserUpdateMessage {
	public readonly type = "UserUpdateMessage" as const;
	constructor(public readonly user: User) {}
}

export type UserStoreMessage = UnionOf<typeof UserStoreMessages>;
