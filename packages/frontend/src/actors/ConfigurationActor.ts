import { Maybe, maybe, nothing } from "tsmonads";
import { StatefulActor } from "./StatefulActor";
import { Nominal, Unit, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { List } from "immutable";

export type Token = Nominal<string, "Token">;
export type ActorUri = Nominal<string, "ActorUri">;

export type ConfigurationState = {
	realName: Maybe<string>;
	nickName: Maybe<string>;
	token: Maybe<Token>;
	serverActorSystem: ActorUri;
	tokenRequesters: List<ActorRef>;
};

export class SetUserToken {
	type = "SetUserToken" as const;
	constructor(public readonly token: Token) {}
}

export class DeleteUserToken {
	type = "DeleteUserToken" as const;
}

export class GetUserToken {
	type = "GetUserToken" as const;
}

export class GetActorUri {
	type = "GetActorUri" as const;
}

export class TokenMessage {
	type = "TokenMessage" as const;
	constructor(public readonly token: Token) {}
}

type ConfigurationActorMessages = SetUserToken | DeleteUserToken | GetUserToken | GetActorUri;

export class ConfigurationActor extends StatefulActor<ConfigurationActorMessages, ActorUri | Unit, ConfigurationState> {
	constructor(name: string, actorSystem: ActorSystem) {
		super(name, actorSystem);
		this.state = {
			realName: nothing(),
			nickName: nothing(),
			token: nothing(),
			serverActorSystem: import.meta.env.VITE_SERVER_SYSTEM,
			tokenRequesters: List(),
		};
		console.log(import.meta.env);
	}

	public async receive(from: ActorRef, message: ConfigurationActorMessages): Promise<ActorUri | Unit> {
		console.log(from, message);
		try {
			switch (message.type) {
				case "SetUserToken":
					this.updateState(draft => {
						draft.token = maybe(message.token);
						// TODO: Extract the other info from the token
					});
					this.state.tokenRequesters.forEach(actorRef =>
						this.send(actorRef, new TokenMessage(message.token))
					);
					break;
				case "DeleteUserToken":
					this.updateState(draft => {
						draft.token = nothing();
					});
					break;
				case "GetActorUri":
					return this.state.serverActorSystem;
				case "GetUserToken":
					this.updateState(draft => {
						draft.tokenRequesters = draft.tokenRequesters.push(from);
					});
					this.state.token.forEach(token => this.send(from, new TokenMessage(token)));
					break;
			}
			return unit();
		} catch (e) {
			console.error(e);
			return unit();
		}
	}
}
