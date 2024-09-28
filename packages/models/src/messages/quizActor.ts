import { unionize, ofType, UnionOf } from "unionize";
import { Id } from "../data/base";
import { Quiz } from "../data/quiz";
import { UserRole } from "../data/user";

export const QuizActorMessages = unionize(
	{
		Create: ofType<Omit<Quiz, "uniqueLink" | "uid">>(), // Create a new quiz, returns the quiz uid (generated if not set)
		Import: ofType<{
			filename: string;
			titlePrefix: string | undefined;
			userId: Id | undefined;
			userRole: UserRole | undefined;
		}>(), // Import the json with the given filename
		Update: ofType<Partial<Quiz> & { uid: Id }>(), // Update quiz data, answers updated Quiz
		Delete: ofType<Id>(), // Completely delete a quiz, including all comments and questions
		GetAll: {}, // Get all quizzes accessible by the requester, will send back all quizzes in this list to the requester
		Has: ofType<Id>(), // Check if quiz exists, answers with boolean
		Get: ofType<Id>(), // Get quiz, answers with quiz
		AddTeacher: ofType<{ quiz: Id; teacher: Id }>(),
		AddStudent: ofType<{ quiz: Id; student: Id }>(),
		RemoveUser: ofType<{ quiz: Id; user: Id }>(),
		SubscribeTo: ofType<Id>(), // Subscribe to all changes of the specific quiz, sends back all updates to requester, including comments and questions
		SubscribeToCollection: ofType<string[]>(), // Subscribe to all changes, sends back all updates to requester. Returns only the requested properties.
		UnsubscribeFrom: ofType<Id>(), // Unsubscribe from a specific quiz's changes, including comments and questions
		UnsubscribeFromCollection: {}, // Unsubscribe from collection changes
		Export: ofType<Id>(), // Export a quiz to a json file, returns the download uri
		Duplicate: ofType<Id>(), // Duplicate a quiz
		GetUserRun: ofType<{ studentId: Id; quizId: Id }>(), // Get the current quiz run of the given user
	},
	{ tag: "QuizActorMessage", value: "value" }
);

/** Message send to the client on quiz subscriptions */
export class QuizUpdateMessage {
	public readonly tag = "QuizUpdateMessage" as const;
	constructor(public readonly quiz: Partial<Quiz>) {}
}

export class QuizDeletedMessage {
	public readonly tag = "QuizDeletedMessage" as const;
	constructor(public readonly quizId: Id) {}
}

export type QuizActorMessage = UnionOf<typeof QuizActorMessages>;
