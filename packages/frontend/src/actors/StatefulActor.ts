import { create } from "mutative";
import { Actor } from "ts-actors";

/** An actor that can transfer it's state to  */
export abstract class StatefulActor<T, U, V> extends Actor<T, U> {
	public stateChanged = new Map<string, (state: V) => void>();

	protected state!: V;

	protected updateState = (drafting: (draft: V) => void) => {
		const newState = create(this.state, drafting);
		this.state = newState;
		for (const [_, observer] of this.stateChanged) {
			console.log("GGJHG");
			observer(newState);
		}
	};
}
