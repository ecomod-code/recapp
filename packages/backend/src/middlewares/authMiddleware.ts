import { IncomingMessage } from "http";
import Container from "typedi";
import { bearerValid, createActorUri } from "../utils";
import { SessionStoreMessages } from "../actors/SessionStore";
import { maybe } from "tsmonads";
import { ActorSystem } from "ts-actors";
import { Id } from "@recapp/models";
import { logger } from "../logger";
import { HttpError } from "koa";

class AuthorizationError extends HttpError {
	constructor(msg = "") {
		super("Authorization error" + msg ? `: ${msg}` : "");
		this.status = 401;
	}
}

export const authenticationMiddleware = (request: IncomingMessage, next: (err: Error | undefined) => void) => {
	let token = request.headers["sec-websocket-protocol"]?.replace("Authorization,", "").trim();
	if (!token) {
		token = request.headers["authorization"]?.toString().replace("Authorization,", "").trim();
	}
	if (!token) {
		next(new AuthorizationError("sec-websocket-protocol or authorization header is missing"));
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
		next(new AuthorizationError());
		return;
	}
	const tokenValid = maybe(request.headers["sec-websocket-protocol"])
		.map(bearerValid)
		.orElse(Promise.resolve("" as Id)) as Promise<Id>;
	tokenValid.then(userId => {
		if (!userId) {
			next(new AuthorizationError());
			return;
		}
		Container.get<ActorSystem>("actor-system").send(
			createActorUri("SessionStore"),
			SessionStoreMessages.StoreSession({ userId, actorSystem })
		);
		next(undefined);
	});
};
