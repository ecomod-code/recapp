import "reflect-metadata";

import { ActorUri, Id, SessionStoreMessages } from "@recapp/models";
import { join } from "path";
import { ActorRef, ActorSystem } from "ts-actors";
import { maybe } from "tsmonads";
import Container from "typedi";
import jwt from "jsonwebtoken";
import koa from "koa";
import crypto from "crypto";

export const systemName = "recapp-backend";

export const createActorUri = (actorName: "SessionStore" | "UserStore" | "QuizActor" | "ErrorActor" | "FingerprintStore"): ActorUri => {
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
	try {
		if (userId) {
			await system.ask(createActorUri("SessionStore"), SessionStoreMessages.GetSessionForUserId(userId));
			return Promise.resolve(userId);
		} else {
			return Promise.reject(new Error("Unknown user"));
		}
	} catch {
		return Promise.reject(new Error("Unknown user"));
	}
};

export const calculateFingerprint = (ctx: koa.Context): string => {
	const components = {
		userAgent: ctx.get("user-agent") || "",
		acceptLanguage: ctx.get("accept-language") || "",
		accept: ctx.get("accept") || "",
		acceptEncoding: ctx.get("accept-encoding") || "",

		ip: ctx.ip || "",

		secChUa: ctx.get("sec-ch-ua") || "",
		secChUaPlatform: ctx.get("sec-ch-ua-platform") || "",
		secChUaMobile: ctx.get("sec-ch-ua-mobile") || "",

		doNotTrack: ctx.get("dnt") || "",

		protocol: ctx.protocol || "",
		host: ctx.host || "",
		origin: ctx.origin || "",

		deviceMemory: ctx.get("device-memory") || "",
		hardwareConcurrency: ctx.get("hardware-concurrency") || "",
	};

	const fingerprintString = Object.entries(components)
		.sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
		.map(([key, value]) => `${key}:${value}`)
		.join("|");

	const hash = crypto.createHash("sha256").update(fingerprintString).digest("hex");

	return hash;
};

const JWT_SECRET = process.env.JWT_SECRET;

export const createTempJwt = (userId: Id, fingerprint: string): any => {
	if (!JWT_SECRET) {
		throw new Error("New secret for JWT generation set in server env");
	}

	const payload: jwt.JwtPayload = {
		userId: fingerprint,
		sub: userId,
		role: "TEMP",
	};

	const options: jwt.SignOptions = {
		expiresIn: "30d",
		algorithm: "HS256",
		audience: "users",
		issuer: "recapp",
	};

	// Optionen zusammenführen, übergebene überschreiben defaults

	try {
		// Token erstellen
		const token = jwt.sign(payload, JWT_SECRET as jwt.Secret, options);
		return token;
	} catch (error) {
		console.error("Error on creating token:", error);
		throw error;
	}
};
