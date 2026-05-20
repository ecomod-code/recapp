import jwt from "jsonwebtoken";
import { Issuer, Client, ClientMetadata } from "openid-client";
import Container from "typedi";
import koa from "koa";
import { ActorSystem } from "ts-actors";
import { calculateFingerprint, createActorUri, createTempJwt } from "../utils";
import { Fingerprint, FingerprintStoreMessages, Id, Session, SessionStoreMessages, User, UserRole, UserStoreMessages } from "@recapp/models";
import { toTimestamp } from "itu-utils";
import { DateTime } from "luxon";
import { maybe } from "tsmonads";
import { v4 } from "uuid";
import { logger } from "../logger";

const { BACKEND_URI, OID_CLIENT_ID, OPENID_PROVIDER, ISSUER, OID_CLIENT_SECRET, REDIRECT_URI, REQUIRES_OFFLINE_SCOPE } =
	process.env;

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
	} catch (e: any) {
		logger.error(`[authLogin] getOidc failed: code=${String(e?.code)} message=${String(e?.message)} stack=${String(e?.stack)}`);
		ctx.throw(400, "ID provider cannot be contacted. Login impossible");
	}

	const authUrl = client.authorizationUrl({
		scope: "openid email profile" + (REQUIRES_OFFLINE_SCOPE ? " offline_access" : ""),
		response_type: "code",
	});
	ctx.redirect(authUrl);
};

export const authTempAccount = async (ctx: koa.Context): Promise<void> => {
	// Fingerprint berechnen
	const fingerprint = calculateFingerprint(ctx);
	const quiz = ctx.query.quiz?.toString();
	const persistentCookie = !!ctx.query.persistent;
	// Prüfen ob gesperrt
	const system = Container.get<ActorSystem>("actor-system");
	const userStore = createActorUri("UserStore");
	const fpStore = createActorUri("FingerprintStore");
	const uid = v4() as Id;

	try {
		let fpData: Fingerprint | Error = await system.ask(fpStore, FingerprintStoreMessages.Get(fingerprint as Id));
		// console.log("New fingerprint", fingerprint, fpData);
		logger.info(`FINGERPRINT seen id=${String(fingerprint)}`);
		if (fpData instanceof Error) {
			// console.debug("A new fingerprint has been found", fingerprint);
			logger.debug(`FINGERPRINT new id=${String(fingerprint)}`);
			const fp: Fingerprint = {
				uid: fingerprint as Id,
				created: toTimestamp(),
				updated: toTimestamp(),
				lastSeen: toTimestamp(),
				usageCount: 1,
				blocked: false,
				userUid: uid,
				initialQuiz: quiz && quiz !== "false" ? quiz as Id : undefined,
			};
			await system.ask(fpStore, FingerprintStoreMessages.StoreFingerprint(fp));
			fpData = fp;
		}
		await system.ask(fpStore, FingerprintStoreMessages.IncreaseCount({ fingerprint: fingerprint as Id, userUid: uid as Id, initialQuiz: quiz && quiz !== "false" ? quiz as Id : undefined }));
		if (fpData.blocked) {
			// console.debug("Fingerprint was blocked", fingerprint);
			logger.warn(`FINGERPRINT blocked id=${String(fingerprint)}`);
			ctx.redirect((process.env.FRONTEND_URI ?? "http://localhost:5173") + "?error=userdeactivated");
			return;
		}
	} catch (e) {
		logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
		logger.debug(`FINGERPRINT new (catch) id=${String(fingerprint)}`);
		const fp: Fingerprint = {
			uid: fingerprint as Id,
			created: toTimestamp(),
			updated: toTimestamp(),
			lastSeen: toTimestamp(),
			usageCount: 1,
			blocked: false,
			userUid: uid,
			initialQuiz: quiz && quiz !== "false" ? quiz as Id : undefined,
		};
		await system.ask(fpStore, FingerprintStoreMessages.StoreFingerprint(fp));
		await system.ask(fpStore, FingerprintStoreMessages.IncreaseCount({ fingerprint: fingerprint as Id, userUid: uid as Id, initialQuiz: quiz && quiz !== "false" ? quiz as Id : undefined }));
	}
	try {
		const existingUser: User | Error = await system.ask(userStore, UserStoreMessages.GetByFingerprint(fingerprint));
		if (existingUser instanceof Error) {
			logger.debug("FINGERPRINT new (no existing user)");
		} else if (!existingUser.active) {
			ctx.redirect((process.env.FRONTEND_URI ?? "http://localhost:5173") + "?error=userdeactivated");
			return;
		}
	} catch (e) {
		logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
	}
	// Wenn nicht, dann Token, temporären User und Session anlegen
	const token = createTempJwt(uid, fingerprint);
	const decoded = jwt.decode(token) as jwt.JwtPayload;
	const sessionStore = createActorUri("SessionStore");
	const expires = DateTime.fromMillis((decoded.exp ?? -1) * 1000).toUTC();
	await system.ask(
		userStore,
		UserStoreMessages.Create({
			uid,
			role: "STUDENT",
			lastLogin: toTimestamp(),
			created: toTimestamp(),
			updated: toTimestamp(),
			username: "Temporary account",
			email: "",
			active: true,
			quizUsage: new Map(),
			isTemporary: true,
			fingerprint,
			initialQuiz: quiz && quiz !== "false" ? quiz : undefined,
		})
	);
	await system.ask(
		sessionStore,
		SessionStoreMessages.StoreSession({
			idToken: token,
			accessToken: token,
			refreshToken: token,
			uid,
			idExpires: toTimestamp(expires),
			refreshExpires: toTimestamp(expires),
			role: "STUDENT",
			persistentCookie,
			fingerprint,
		})
	);
	// Cookie setzen und zurückleiten
	const thirtyDaysFromNow = new Date();
	thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
	ctx.set("Set-Cookie", `bearer=${token}; path=/; Expires=${thirtyDaysFromNow.toUTCString()}`);
	ctx.redirect(process.env.FRONTEND_URI ?? "http://localhost:5173");
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
		logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
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
			let role: UserRole = "TEACHER";
			const decoded = jwt.decode(tokenSet.id_token ?? "") as jwt.JwtPayload;
			/* console.error(decoded);
			console.error(tokenSet.claims());
			console.error(tokenSet.scope);
			console.error("-------", tokenSet.refresh_token); */
			const decodedRefresh = jwt.decode(tokenSet.refresh_token ?? "") as jwt.JwtPayload;
			const uid: Id = decoded.sub as Id;
			try {
				const userExists = await system.ask(userStore, UserStoreMessages.Has(uid));
				if (!userExists) {
					await system.ask(
						userStore,
						UserStoreMessages.Create({
							uid,
							role: "TEACHER",
							lastLogin: toTimestamp(),
							created: toTimestamp(),
							updated: toTimestamp(),
							username: decoded.name ?? "",
							email: decoded.email ?? "",
							active: true,
							quizUsage: new Map(),
							isTemporary: false,
						})
					);
				} else {
					const u: User = await system.ask(userStore, UserStoreMessages.Get(uid));
					if (!u.active) {
						ctx.status = 401;
						ctx.redirect((process.env.FRONTEND_URI ?? "http://localhost:5173") + "?error=userdeactivated"); // TODO: FRONTEND_URI ?? "");
						return;
					}
					const user: User = await system.ask(
						userStore,
						UserStoreMessages.Update({
							uid,
							username: decoded.name,
							email: decoded.email,
							lastLogin: toTimestamp(),
							updated: toTimestamp(),
						})
					);
					role = user.role;
				}
				const expires = DateTime.fromMillis((decoded.exp ?? -1) * 1000).toUTC();
				const refreshExpires = DateTime.fromMillis(((decodedRefresh ?? decoded).exp ?? -1) * 1000).toUTC();
				// console.log("Setting expiry to", expires.toISO(), refreshExpires.toISO());
				logger.debug(`AUTH token expiry idToken=${String(expires.toISO())} refresh=${String(refreshExpires.toISO())}`);
				const sessionStore = createActorUri("SessionStore");
				await system.ask(
					sessionStore,
					SessionStoreMessages.StoreSession({
						idToken: tokenSet.id_token ?? "",
						accessToken: tokenSet.access_token ?? "",
						refreshToken: tokenSet.refresh_token ?? "",
						uid: decoded.sub as Id,
						idExpires: toTimestamp(expires),
						refreshExpires: toTimestamp(refreshExpires),
						role,
					})
				);
				ctx.set("Set-Cookie", `bearer=${tokenSet.id_token}; path=/; expires=${refreshExpires.toHTTP()}`);
			} catch (e) {
				logger.error(`authProviderCallback ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
				throw e;
			}
			ctx.redirect((process.env.FRONTEND_URI ?? "http://localhost:5173") + "/Dashboard");
		},
		() => ctx.throw(401, "Unable to sign in.")
	);
};

/**
 * Start Authentik logout flow.
 * Also performs a local session logout.
 */
export const authLogout = async (ctx: koa.Context): Promise<void> => {
	const maybeIdToken = maybe<string>(ctx.request.headers.cookie)
		.flatMap(cookie => maybe<RegExpExecArray>(/bearer=([^;]+)/.exec(cookie)))
		.flatMap(match => maybe(match[1]));

	await maybeIdToken.match(
		async idToken => {
			try {
				const { sub } = jwt.decode(idToken) as jwt.JwtPayload;
				const system = Container.get<ActorSystem>("actor-system");
				const sessionStore = createActorUri("SessionStore");
				const session: Session | Error = await system
					.ask(sessionStore, SessionStoreMessages.GetSessionForUserId(sub as Id))
					.then(s => s as Session)
					.catch((e: Error) => {
						return e;
					});
				if (session instanceof Error) {
					throw session;
				}
				await system.ask(sessionStore, SessionStoreMessages.RemoveSession(session.uid));
				if (session.fingerprint) {
					const userStore = createActorUri("UserStore");
					await system.ask(
						userStore,
						UserStoreMessages.Remove(session.uid)
					);
				}
			} catch (e) {
				logger.error(`authLogout ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
				throw e;
			}
		},
		() => ctx.throw(401, "Unable to sign out.")
	);

	ctx.set("Set-Cookie", `bearer=; path=/; max-age=0`);
	ctx.redirect(process.env.FRONTEND_URI ?? "http://localhost:5173");
};

export const authRefresh = async (ctx: koa.Context): Promise<void> => {
	const maybeIdToken = maybe<string>(ctx.request.headers.cookie)
		.flatMap(cookie => maybe<RegExpExecArray>(/bearer=([^;]+)/.exec(cookie)))
		.flatMap(match => maybe(match[1]));

	await maybeIdToken.match(
		async idToken => {
			try {
				const { sub } = jwt.decode(idToken) as jwt.JwtPayload;

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
					ctx.set("Set-Cookie", `bearer=; path=/`);
					ctx.throw(401, "Session unknown");
				}
				// If this is a temporary account, just return
				if (session.fingerprint) {
					const fpStore = createActorUri("FingerprintStore");
					try {
						let fpData: Fingerprint = await system.ask(fpStore, FingerprintStoreMessages.Get(session.fingerprint as Id));
						await system.ask(fpStore, FingerprintStoreMessages.IncreaseCount({ fingerprint: session.fingerprint as Id, userUid: session.uid, initialQuiz: undefined }));
						if (fpData.blocked) {
							await system.ask(sessionStore, SessionStoreMessages.RemoveSession(sub as Id));
							ctx.set("Set-Cookie", `bearer=; path=/`);
							ctx.throw(401, "Token renewal failure");
							return;
						}
					} catch (e) {
						logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
					}
					const token = createTempJwt(session.uid, session.fingerprint);
					const thirtyDaysFromNow = new Date();
					thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
					ctx.set("Set-Cookie", `bearer=${token}; path=/; expires=${thirtyDaysFromNow.toUTCString()}`);
					ctx.body = "O.K.";
					return;
				}

				try {
					const newTokenSet = await client.refresh(session.refreshToken);
					const decoded = jwt.decode(newTokenSet.id_token ?? "") as jwt.JwtPayload;
					const decodedRefresh = jwt.decode(newTokenSet.refresh_token ?? "") as jwt.JwtPayload;
					const expires = DateTime.fromMillis((decoded.exp ?? -1) * 1000).toUTC();
					const refreshExpires = DateTime.fromMillis(((decodedRefresh ?? decoded).exp ?? -1) * 1000).toUTC();
					logger.debug(`AUTH refresh expiry idToken=${String(expires.toISO())} refresh=${String(refreshExpires.toISO())}`);
					await system.ask(
						sessionStore,
						SessionStoreMessages.StoreSession({
							uid: sub as Id,
							idToken: newTokenSet.id_token ?? "",
							accessToken: newTokenSet.access_token ?? "",
							refreshToken: newTokenSet.refresh_token ?? "",
							idExpires: toTimestamp(expires),
							refreshExpires: toTimestamp(refreshExpires),
						})
					);
					// console.log(`User ${sub} token was refreshed.`);
					logger.info(`AUTH token refreshed`); // omit sub to avoid identifying users
					ctx.set("Set-Cookie", `bearer=${newTokenSet.id_token}; path=/; expires=${refreshExpires.toHTTP()}`);
					// ctx.body = "O.K.";
					ctx.body = {
						expires_at: expires.toISO(),
						refresh_expires: refreshExpires.toISO()
					};

				} catch (e) {
					// console.error("Failed to renew token", e);
					logger.warn(`AUTH failed to renew token: ${e instanceof Error ? e.stack : String(e)}`);
					await system.ask(sessionStore, SessionStoreMessages.RemoveSession(sub as Id));
					ctx.set("Set-Cookie", `bearer=; path=/`);
					ctx.throw(401, "Token renewal failure");
				}
			} catch (e) {
				logger.error(e instanceof Error ? e.stack ?? e.message : String(e));
				ctx.set("Set-Cookie", `bearer=; path=/`);
				ctx.throw(401, "Invalid token");
			}
		},
		() => ctx.throw(401, "Invalid token")
	);
};
