import { ActorUri } from "@recapp/models";

export const actorUris: Record<string, ActorUri> = {
	UserStore: "actors://recapp-backend/UserStore" as ActorUri,
	SessionStore: "actors://recapp-backend/SessionStore" as ActorUri,
	QuizActor: "actors://recapp-backend/QuizActor" as ActorUri,
	CommentActorPrefix: "actors://recapp-backend/QuizActor/Comment_" as ActorUri,
	QuestionActorPrefix: "actors://recapp-backend/QuizActor/Question_" as ActorUri,
	QuizRunActorPrefix: "actors://recapp-backend/QuizActor/QuizRun_" as ActorUri,
};
