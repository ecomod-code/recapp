import { DistributedActorSystem } from "ts-actors";
import { WebsocketDistributor } from "ts-actors/lib/src/WebsocketDistributor";
import { v4 } from "uuid";
import { ListActor } from "./ListActor";
import { ConfigurationActor, SetUserToken, Token } from "./ConfigurationActor";

const systemName = v4();

const distributor = new WebsocketDistributor(systemName, "ws://localhost:12345");

export const system = await DistributedActorSystem.create({ distributor, systemName });
const config = await system.createActor(ConfigurationActor, { name: "Configuration" });
await system.createActor(ListActor, { name: "ElementList" });
await system.send(config, new SetUserToken("boofar" as Token));
