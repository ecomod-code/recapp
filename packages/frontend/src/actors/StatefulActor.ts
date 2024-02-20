import { create } from "mutative";
import { Actor } from "ts-actors";

/** An actor that can transfer it's state to  */
export abstract class StatefulActor<T, U, V> extends Actor<T, U> {
	/** Call this method everytime the state of the actor has changed */
	public stateChanged?: (state: V) => void;

	protected state!: V;

	protected updateState = (drafting: (draft: V) => void) => {
		const newState = create(this.state, drafting);
		this.state = newState;
		if (this.stateChanged) this.stateChanged(newState);
	};
}
