import { ActorSystem, ActorRef } from "ts-actors";
import { StatefulActor } from "./StatefulActor";

export class PingPongActor extends StatefulActor<string, void,number> {
	public counter = 0;

	constructor(name: string, actorSystem: ActorSystem, other: ActorRef) {
		super(name, actorSystem);
		if (other) {
			this.send(other, "Ping");
		}
	}

	public async receive(from: ActorRef, message: string): Promise<void> {
		console.log(from.name, message, this.stateChanged);
		if (this.stateChanged) this.stateChanged(this.counter);
		switch (message) {
			case "Ping": {
				this.counter++;
				if (this.counter > 5) {
					// this.shutdown();
					return;
				}
				setTimeout(() =>this.send("actors://SA/PING", "Pong"), 1000);
				break;
			}
			case "Pong": {
				this.counter++;
				if (this.counter > 5) {
					//this.shutdown();
					return;
				}
				setTimeout(() => this.send("actors://SA/PING", "Ping"), 1000);
				break;
			}
			default:
				break;
		}
	}
}
