import { IncomingMessage } from "http";
import Container from "typedi";
import { bearerValid, createActorUri } from "../utils";
import { maybe } from "tsmonads";
import { ActorSystem } from "ts-actors";
import { Id, SessionStoreMessages } from "@recapp/models";
import { logger } from "../logger";
import createError from "http-errors";

const authorizationError = (msg?: string) => createError(401, "Authorization error" + msg ? `: ${msg}` : "");

export const authenticationMiddleware = (request: IncomingMessage, next: (err: Error | undefined) => void) => {
	let token = request.headers["sec-websocket-protocol"]?.replace("Authorization,", "").trim();
	if (!token) {
		token = request.headers["authorization"]?.toString().replace("Authorization,", "").trim();
	}
	if (!token) {
		next(authorizationError("sec-websocket-protocol or authorization header is missing"));
		return;
	}
	if (Container.get<string[]>("api-keys").includes(token.replace("apikey=", ""))) {
		// Internal service with api key always has access
		logger.info("Connected internal service");
		next(undefined);
		return;
	}
	// We require an actor system identifier for the client to be transferred when requesting a websocket. Otherwise, it's
	// not possible to match client actor systems and user sessions.
	const actorSystem = new URL(`http://xyz${request.url ?? ""}`).searchParams.get("clientActorSystem") ?? "";
	if (!actorSystem) {
		next(authorizationError());
		return;
	}
	const tokenValid = maybe(request.headers["sec-websocket-protocol"])
		.map(bearerValid)
		.orElse(Promise.resolve("" as Id)) as Promise<Id>;
	tokenValid
		.then(uid => {
			if (!uid) {
				next(authorizationError());
				return;
			}
			Container.get<ActorSystem>("actor-system").send(
				createActorUri("SessionStore"),
				SessionStoreMessages.StoreSession({ uid, actorSystem })
			);
			next(undefined);
		})
		.catch(e => next(e));
};
