import { Id } from "@recapp/models";
import { Timestamp, Unit, minutes, toTimestamp, unit } from "itu-utils";
import { DateTime } from "luxon";
import { Actor, ActorRef, ActorSystem } from "ts-actors";

export const CHECK_TIME = minutes(1);
export const HOLDING_TIME = minutes(2);

export class GetClosedClientList {
	public readonly type = "GetClosedClientList" as const;
}

export class ErrorActor extends Actor<Error | GetClosedClientList, Unit | Id[]> {
	private oldCLients = new Map<Id, Timestamp>();

	constructor(name: string, system: ActorSystem) {
		super(name, system);
	}

	private removeOldEntries = () => {
		const originalKeys = Array.from(this.oldCLients.keys());
		const cutOff = DateTime.utc().minus({ minutes: 2 });
		const deletingKeys = originalKeys.filter(key => this.oldCLients.get(key)! < toTimestamp(cutOff));
		deletingKeys.forEach(key => {
			this.oldCLients.delete(key);
		});
	};

	override async receive(_from: ActorRef, message: Error | GetClosedClientList): Promise<Unit | Id[]> {
		if (message instanceof Error) {
			this.logger.error(message.toString());
			if ((message as any).socketName) {
				this.oldCLients.set((message as any).socketName, toTimestamp());
			}
		} else {
			// GetClosedClientList
			this.removeOldEntries();
			return Array.from(this.oldCLients.keys());
		}
		return unit();
	}
}
