import "reflect-metadata";

import { DistributedActorSystem } from "ts-actors";
import { WebsocketDistributor } from "ts-actors/lib/src/WebsocketDistributor";
import { SessionStore } from "./actors/SessionStore";
import { Container } from "typedi";
import { UserStore } from "./actors/UserStore";
import { systemName } from "./utils";

import koaRouter from "@koa/router";
import koa from "koa"; // koa@2
import cors from "@koa/cors";
import session from "koa-session";
import koaBody from "koa-bodyparser";
import koaLogger from "koa-logger-winston";
import { authLogin, authLogout, authProviderCallback, authRefresh } from "./middlewares/authRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./logger";
import { authenticationMiddleware } from "./middlewares/authMiddleware";

const config = {
	port: parseInt(process.env.SERVER_PORT ?? "3123"),
	host: process.env.SERVER_HOST ?? "127.0.0.1",
	frontend: process.env.FRONTEND_DASHBOARD ?? "http://localhost:5173/Dashboard",
};

Container.set<string[]>("api-keys", process.env.API_KEYS?.split(",") ?? []);
Container.set("config", config);

const router = new koaRouter();
const app = new koa();

router
	.get("/auth/login", authLogin)
	.get("/auth/callback", authProviderCallback)
	.get("/auth/logout", authLogout)
	.get("/auth/refresh", authRefresh);

const start = async () => {
	try {
		app.use(errorHandler);
		app.use(koaLogger(logger));
		app.use(koaBody());
		app.keys = [process.env.OID_CLIENT_SECRET as string];
		app.use(session({}, app));
		app.use(cors({ credentials: true }));
		app.use(router.routes());
		app.use(router.allowedMethods());

		const httpServer = app.listen(3123, "127.0.0.1");

		const distributor = new WebsocketDistributor(systemName, {
			server: httpServer,
			authenticationMiddleware,
			headers: {
				Authorization: "apikey=25868755-c11c-42ee-b4ed-2115ac982ba4",
			},
		});
		const system = await DistributedActorSystem.create({ distributor, systemName, logger });
		Container.set("actor-system", system);
		await system.createActor(SessionStore, { name: "SessionStore", strategy: "Restart" });
		await system.createActor(UserStore, { name: "UserStore", strategy: "Restart" });
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

start();
