import { Unit, unit, minutes } from "itu-utils";
import { Actor, ActorRef, ActorSystem } from "ts-actors";
import Axios from "axios";
import { cookie } from "../utils";

const updateToken = () => {
	const hasToken = !!cookie("bearer");
	if (hasToken) {
		Axios.get(import.meta.env.VITE_BACKEND_URI + "/auth/refresh", { withCredentials: true }).catch(() => {
			alert("Could not refresh token. Please report this error");
			window.location.href = "/";
		});
	}
};

export class TokenActor extends Actor<unknown, Unit> {
	public interval: any;

	public constructor(name: string, system: ActorSystem) {
		super(name, system);
	}

	public override async afterStart(): Promise<void> {
		this.interval = setInterval(updateToken, minutes(import.meta.env.VITE_INACTIVITY_LIMIT).valueOf());
	}

	public override async beforeShutdown(): Promise<void> {
		clearInterval(this.interval);
	}

	public async receive(_from: ActorRef, _message: unknown): Promise<Unit> {
		return unit();
	}
}
