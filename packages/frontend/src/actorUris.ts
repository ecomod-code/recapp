import { ActorUri } from "@recapp/models";

export const actorUris: Record<string, ActorUri> = {
	UserStore: "actors://recapp-backend/UserStore" as ActorUri,
	SessionStore: "actors://recapp-backend/SessionStore" as ActorUri,
};
