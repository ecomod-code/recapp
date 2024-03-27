import { DistributedActorSystem } from "ts-actors";
import { WebsocketDistributor } from "ts-actors/lib/src/WebsocketDistributor";
import { v4 } from "uuid";
import { cookie } from "./utils";
import { actorUris } from "./actorUris";
import { toActorUri } from "@recapp/models";
import { CreateQuizActor } from "./actors/CreateQuizActor";
import { CurrentQuizActor } from "./actors/CurrentQuizActor";
import { ErrorActor } from "./actors/ErrorActor";
import { LocalUserActor } from "./actors/LocalUserActor";
import { SharingActor } from "./actors/SharingActor";
import { TokenActor } from "./actors/TokenActor";
import { UserAdminActor } from "./actors/UserAdminActor";

const systemId = v4();

const serverUri = `${import.meta.env.VITE_BACKEND_URI.replace("http", "ws")}`;
const authToken = cookie("bearer");

const distributor = new WebsocketDistributor(systemId, `${serverUri}/ws?clientActorSystem=${systemId}`, authToken);

export const system = DistributedActorSystem.create({ distributor, systemName: systemId }).then(async s => {
	try {
		const ea = await s.createActor(ErrorActor, { name: "ErrorActor" });
		actorUris["ErrorActor"] = toActorUri(ea.name);
		const ua = await s.createActor(UserAdminActor, { name: "UserAdmin" });
		actorUris["UserAdmin"] = toActorUri(ua.name);
		const lu = await s.createActor(LocalUserActor, { name: "LocalUser" });
		actorUris["LocalUser"] = toActorUri(lu.name);
		const cuq = await s.createActor(CurrentQuizActor, { name: "CurrentQuiz" });
		actorUris["CurrentQuiz"] = toActorUri(cuq.name);
		const crq = await s.createActor(CreateQuizActor, { name: "CreateQuiz" });
		actorUris["CreateQuiz"] = toActorUri(crq.name);
		const qsa = await s.createActor(SharingActor, { name: "QuizSharing" });
		actorUris["QuizSharing"] = toActorUri(qsa.name);
		const ta = await s.createActor(TokenActor, { name: "TokenActor" });
		actorUris["TokenActor"] = toActorUri(ta.name);

		const sa = s.getActorRef(`actors://${s.systemName}`);
		return s;
	} catch (e) {
		console.error(e);
		return Promise.reject(e);
	}
});
