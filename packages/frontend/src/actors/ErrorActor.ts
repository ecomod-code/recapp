import { Unit, unit } from "itu-utils";
import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import unionize, { UnionOf, ofType } from "unionize";
import { keys } from "rambda";

export const ErrorMessages = unionize(
	{
		SetError: ofType<Error>(),
		ResetError: {},
		LogWarning: ofType<string>(),
	},
	{ tag: "ErrorMessage", value: "value" }
);

export type ErrorMessage = UnionOf<typeof ErrorMessages>;

const errorIds = {
	deactivated: "error-message-user-deactivated",
	expired: "error-message-session-expired",
	rpc: "error-message-no-server-connection",
	unknown: "error-unknown-error-occured",
};

export class ErrorActor extends StatefulActor<ErrorMessage, Unit, { error: string }> {
	protected state = { error: "" };

	public constructor(name: string, system: ActorSystem) {
		super(name, system);
	}

	private errorForMessage = (errorMsg: string): string => {
		const keyNames = keys(errorIds);
		for (const key of keyNames) {
			if (errorMsg.toLocaleLowerCase().includes(key)) {
				return errorIds[key];
			}
		}
		return "";
	};

	public override async afterStart(): Promise<void> {
		console.warn("AFTERSTART", this.name);
	}

	public async receive(_from: ActorRef, message: ErrorMessage): Promise<Unit> {
		console.log(_from, JSON.stringify(message), JSON.stringify(ErrorMessages.SetError(new Error("fdgjfhgdfjhg"))));
		ErrorMessages.match(message, {
			SetError: error => {
				console.error(error);
				this.updateState(draft => {
					draft.error = this.errorForMessage(error.message);
				});
			},
			ResetError: () => {
				this.updateState(draft => {
					draft.error = "";
				});
			},
			LogWarning: warning => {
				console.warn(warning);
			},
		});
		return unit();
	}
}
