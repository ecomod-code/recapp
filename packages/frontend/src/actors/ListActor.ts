import { ActorSystem, ActorRef } from "ts-actors";
import { StatefulActor } from "./StatefulActor";
import { List } from "immutable";
import { ActorUri, GetActorUri, GetUserToken, Token, TokenMessage } from "./ConfigurationActor";
import { Maybe, maybe, nothing } from "tsmonads";
import { debug } from "itu-utils";

export class UpdateElement {
	type = "UpdateElement" as const;
	constructor(public readonly element: Element) {}
}

export class SubscribeElements {
	type = "SubscribeElements" as const;
	constructor(
		public readonly category: string,
		public readonly token: Token
	) {}
}

export class UnubscribeElements {
	type = "UnubscribeElements" as const;
	constructor(
		public readonly category: string,
		public readonly token: Token
	) {}
}

export class DeleteElement {
	type = "DeleteElement" as const;
	constructor(public readonly id: number) {}
}

export class SetCategory {
	type = "SetCategory" as const;
	constructor(public readonly category: "foo" | "bar") {}
}

export class Element {
	constructor(
		public readonly id: number,
		public readonly content: string
	) {}
}

interface ErrorMsg {
	type: "Error";
	error: string;
}

type ActorMessages = ErrorMsg | UpdateElement | DeleteElement | SetCategory | TokenMessage;

const LIST_ACTOR = "/List";

type ActorState = {
	elements: List<Element>;
	category: "foo" | "bar";
};

export const baseState: ActorState = {
	elements: List(),
	category: "foo",
};

export class ListActor extends StatefulActor<ActorMessages, void, ActorState> {
	private actorUri: Maybe<ActorUri> = nothing();
	private token: Maybe<Token> = nothing();

	constructor(name: string, actorSystem: ActorSystem) {
		super(name, actorSystem);
		this.state = baseState;
		this.init();
	}

	private async init() {
		const result = await this.ask<GetActorUri, ActorUri>(
			`actors://${this.system.systemName}/Configuration`,
			new GetActorUri()
		);
		console.log(`ListActor got received server actor system URI ${result}`);
		this.actorUri = maybe(result);
		this.send(`actors://${this.system.systemName}/Configuration`, new GetUserToken());
	}

	private subscribeWithToken = async () => {
		this.token.forEach(token =>
			this.actorUri.forEach(actorUri =>
				this.send(actorUri + LIST_ACTOR, new SubscribeElements(this.state.category, token))
			)
		);
	};

	public async receive(_from: ActorRef, message: ActorMessages): Promise<void> {
		try {
			switch (message.type) {
				case "DeleteElement":
					this.updateState(draft => {
						draft.elements = draft.elements.filter(e => e.id != message.id);
					});
					break;

				case "UpdateElement":
					this.updateState(draft => {
						draft.elements = draft.elements
							.filter(e => e.id != message.element.id)
							.push(message.element)
							.sort((a, b) => a.id - b.id);
					});
					break;

				case "SetCategory":
					this.token.forEach(token =>
						this.actorUri.forEach(actorUri =>
							this.send(actorUri + LIST_ACTOR, new UnubscribeElements(this.state.category, token))
						)
					);
					this.updateState(draft => {
						draft.category = message.category;
					});
					this.token.forEach(token =>
						this.actorUri.forEach(actorUri =>
							this.send(actorUri + LIST_ACTOR, new SubscribeElements(this.state.category, token))
						)
					);
					break;

				case "TokenMessage":
					console.log(`${this.name} received new user token ${message.token}`);
					this.token = maybe(message.token);
					await this.subscribeWithToken();
					break;
				default:
					console.error(message);
					break;
			}
		} catch (e) {
			console.error(e);
		}
	}
}
