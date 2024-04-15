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
import multer from "@koa/multer";
import type { File } from "@koa/multer";
import type { IncomingMessage } from "http";
import koaLogger from "koa-logger-winston";
import { authLogin, authLogout, authProviderCallback, authRefresh } from "./middlewares/authRoutes";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./logger";
import { authenticationMiddleware } from "./middlewares/authMiddleware";
import { QuizActor } from "./actors/QuizActor";
import { ErrorActor } from "./actors/ErrorActor";
import { createReadStream, existsSync } from "fs";
import * as path from "path";

const config = {
	port: parseInt(process.env.SERVER_PORT ?? "3123"),
	host: process.env.SERVER_HOST ?? "127.0.0.1",
	frontend: process.env.FRONTEND_URI ? process.env.FRONTEND_URI + "/Dashboard" : "http://localhost:5173/Dashboard",
};

Container.set<string[]>("api-keys", process.env.API_KEYS?.split(",") ?? []);
Container.set("config", config);

const router = new koaRouter();
const app = new koa();

const upload = multer({
	dest: "./downloads",
	fileFilter: (_req: IncomingMessage, file: File, callback: (error: Error | null, acceptFile: boolean) => void) => {
		if (![".json"].includes(path.extname(file.originalname).toLocaleLowerCase())) {
			console.warn(`File ${file.originalname} cannot be uploaded. Wrong file format`);
			callback(new Error(`File ${file.originalname} cannot be uploaded. Wrong file format`), false);
		}
		callback(null, true);
	},
	limits: {
		fileSize: 1_048_576, // 1 MB
	},
});

router
	.get("/auth/login", authLogin)
	.get("/auth/callback", authProviderCallback)
	.get("/auth/logout", authLogout)
	.get("/auth/refresh", authRefresh)
	.get("/ping", ctx => {
		ctx.status = 200;
		ctx.body = "PONG";
	})
	.get("/download/:name", ctx => {
		try {
			const fn = ctx.params?.name?.toString();
			if (!fn || !existsSync(path.join("./downloads/", fn))) {
				ctx.throw(404);
				return;
			}
			const stream = createReadStream(path.join("./downloads/", fn));
			ctx.body = stream;
			ctx.set("Content-disposition", "attachment; filename=" + fn);
			ctx.set("Content-type", "application/txt");
			ctx.status = 200;
		} catch {
			ctx.throw(404);
		}
	})
	.post("/upload", upload.single("file"), async ctx => {
		const file = ctx.request.file;
		ctx.body = file.filename;
		ctx.status = 200;
	});

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
		await system.createActor(QuizActor, { name: "QuizActor", strategy: "Restart" });
		await system.createActor(ErrorActor, { name: "ErrorActor", strategy: "Restart", errorReceiver: true });
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
};

start();
