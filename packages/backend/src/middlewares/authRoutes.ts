/* eslint-disable @typescript-eslint/no-explicit-any */
import jwt from "jsonwebtoken";
import { Issuer, Client, ClientMetadata } from "openid-client";
import Container from "typedi";
import koa from "koa";
import { ActorSystem } from "ts-actors";
import { createActorUri } from "../utils";
import { Id, Session, SessionStoreMessages, User, UserRole, UserStoreMessages } from "@recapp/models";
import { Timestamp, fromTimestamp, hours, minutes, toTimestamp } from "itu-utils";
import { DateTime } from "luxon";
import { maybe } from "tsmonads";
import { debug } from "itu-utils";

const { BACKEND_URI, OID_CLIENT_ID, OPENID_PROVIDER, ISSUER, OID_CLIENT_SECRET, REDIRECT_URI } = process.env;

export const getOidc = async () => {
	if (!Container.has("oidc")) {
		await initOidc();
	}
	return Container.get<Client>("oidc");
};

const initOidc = async () => {
	const issuer = await Issuer.discover(`${OPENID_PROVIDER}/${ISSUER}/`);
	const options: ClientMetadata = {
		client_id: OID_CLIENT_ID ?? "",
		client_secret: OID_CLIENT_SECRET ?? "",
		response_types: ["code"],
	};
	if (REDIRECT_URI) {
		options.redirect_uris = [`${BACKEND_URI}${REDIRECT_URI}`];
	}
	const client = new issuer.Client(options);
	Container.set("oidc", client);
};

/**
 * Login using an external OpenIDConnect provider
 */
export const authLogin = async (ctx: koa.Context): Promise<void> => {
	let client: Client;
	try {
		client = await getOidc();
	} catch (e) {
		ctx.throw(400, "ID provider cannot be contacted. Login impossible");
	}

	const authUrl = client.authorizationUrl({
		scope: "openid email profile",
		response_type: "code",
	});
	ctx.redirect(authUrl);
};

/**
 * Callback after login flow is finished
 *
 * A usertoken cookie will be set so that the client can access the user's metadata
 */
export const authProviderCallback = async (ctx: koa.Context): Promise<void> => {
	let client: Client;
	try {
		client = await getOidc();
	} catch (e) {
		console.error(e);
		ctx.status = 400;
		ctx.body = "ID provider cannot be contacted. Access impossible.";
		return;
	}
	const maybeParams = maybe(client.callbackParams(ctx.request.url)).map(params => {
		if (params.state === "") {
			// Current oidc version might set this to empty string which leads to an error later
			delete params.state;
		}
		return params;
	});

	const mayBeTokenSet = maybeParams.map(params => client.callback(`${BACKEND_URI}/auth/callback`, params));

	await mayBeTokenSet.match(
		async tokenSetPromise => {
			const tokenSet = await tokenSetPromise;
			const system = Container.get<ActorSystem>("actor-system");
			const userStore = createActorUri("UserStore");
			let role: UserRole = "STUDENT";
			const decoded = jwt.decode(tokenSet.id_token ?? "") as jwt.JwtPayload;
			const uid: Id = decoded.sub as Id;
			try {
				const userExists = await system.ask(userStore, UserStoreMessages.Has(uid));
				if (!userExists) {
					await system.send(
						userStore,
						UserStoreMessages.Create({
							uid,
							role: "STUDENT",
							lastLogin: toTimestamp(),
							created: toTimestamp(),
							updated: toTimestamp(),
							username: decoded.name,
							active: true,
							quizUsage: new Map(),
						})
					);
				} else {
					const u: User = await system.ask(userStore, UserStoreMessages.Get(uid));
					if (!u.active) {
						ctx.status = 401;
						ctx.redirect("http://localhost:5173/?error=userdeactivated"); // TODO: FRONTEND_URI ?? "");
						return;
					}
					const user: User = await system.ask(
						userStore,
						UserStoreMessages.Update({
							uid,
							lastLogin: toTimestamp(),
							updated: toTimestamp(),
						})
					);
					role = user.role;
				}
				const expires = DateTime.fromMillis((decoded.exp ?? -1) * 1000).toUTC();
				console.log("Setting expiry to", expires.toISO());
				const sessionStore = createActorUri("SessionStore");
				system.send(
					sessionStore,
					SessionStoreMessages.StoreSession({
						idToken: tokenSet.id_token ?? "",
						accessToken: tokenSet.access_token ?? "",
						refreshToken: tokenSet.refresh_token ?? "",
						uid: decoded.sub as Id,
						expires: toTimestamp(expires),
						role,
					})
				);
			} catch (e) {
				console.error("authProviderCallback", e);
				throw e;
			}
			ctx.set("Set-Cookie", `bearer=${tokenSet.id_token}; path=/; max-age=${hours(2).valueOf() / 1000}`);
			ctx.redirect("http://localhost:5173/Dashboard"); // TODO: FRONTEND_URI ?? "");
		},
		() => ctx.throw(401, "Unable to sign in.")
	);
};

/**
 * Start Authentik logout flow.
 * Also performs a local session logout.
 */
export const authLogout = async (ctx: koa.Context): Promise<void> => {
	ctx.set("Set-Cookie", `bearer=; path=/; max-age=0; httponly`);
	ctx.redirect("http://localhost:5173/");
};

export const authRefresh = async (ctx: koa.Context): Promise<void> => {
	const maybeIdToken = maybe<string>(ctx.request.headers.cookie)
		.flatMap(cookie => maybe<RegExpExecArray>(/bearer=([^;]+)/.exec(cookie)))
		.map(s => debug(s, s.join(", ")))
		.flatMap(match => maybe(match[1]));

	await maybeIdToken.match(
		async idToken => {
			try {
				const { exp, sub } = jwt.decode(idToken) as jwt.JwtPayload;
				if (fromTimestamp(exp! * 1000) > DateTime.local().minus(minutes(45))) {
					console.log("Refresh not needed yet");
					console.log(
						`Session ${fromTimestamp(exp! * 1000).toISO()} < ${DateTime.local().minus(minutes(45))}`
					);
					ctx.body = "O.K.";
					return; // We do not need to refresh the token yet
				}
				// Refresh the token
				const client = await getOidc();
				const system = Container.get<ActorSystem>("actor-system");
				const sessionStore = createActorUri("SessionStore");
				const session: Error | Session = await system
					.ask(sessionStore, SessionStoreMessages.GetSessionForUserId(sub as Id))
					.then(s => s as Session)
					.catch((e: Error) => {
						return e;
					});
				if (session instanceof Error) {
					ctx.throw(401, "Session unknown");
				}
				const newTokenSet = await client.refresh(session.refreshToken);
				system.send(
					sessionStore,
					SessionStoreMessages.StoreSession({
						uid: sub as Id,
						idToken: newTokenSet.id_token ?? "",
						accessToken: newTokenSet.access_token ?? "",
						refreshToken: newTokenSet.refresh_token ?? "",
						expires: new Timestamp(newTokenSet.expires_at ?? -1),
					})
				);
				ctx.set("Set-Cookie", `bearer=${newTokenSet.id_token}; path=/; max-age=${hours(2).valueOf() / 1000}`);
				ctx.body = "O.K.";
			} catch (e) {
				console.error(e);
				ctx.throw(401, "Invalid token");
			}
		},
		() => ctx.throw(401, "Invalid token")
	);
};
