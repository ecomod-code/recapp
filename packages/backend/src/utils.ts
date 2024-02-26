import "reflect-metadata";

import { ActorUri, Id, SessionStoreMessages } from "@recapp/models";
import { join } from "path";
import { ActorRef, ActorSystem } from "ts-actors";
import { maybe } from "tsmonads";
import Container from "typedi";
import jwt from "jsonwebtoken";

export const systemName = "recapp-backend";

export const createActorUri = (actorName: string): ActorUri => {
	return `actors://${join(systemName, actorName)}` as ActorUri;
};

export const extractSystemName = (actorName: string): Id => {
	return (/^actors:\/\/(.+)\/.*$/.exec(actorName)?.[1] ?? "") as Id;
};

export const systemEquals = (actorA: ActorRef, actorB: ActorRef): boolean => {
	return extractSystemName(actorA.name) === extractSystemName(actorB.name);
};

export const bearerValid = async (idTokenString: string): Promise<Id> => {
	const system = Container.get<ActorSystem>("actor-system");
	const userId = maybe(jwt.decode(idTokenString.replace("Authorization,", "").trim()) as jwt.JwtPayload)
		.flatMap(token => maybe(token.sub as Id))
		.orUndefined();
	if (userId) {
		await system.ask(createActorUri("SessionStore"), SessionStoreMessages.GetSessionForUserId(userId));
		return Promise.resolve(userId);
	} else {
		return Promise.reject(new Error("Unknown user"));
	}
};
