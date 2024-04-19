import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { Id, Quiz, QuizActorMessages, User, UserStoreMessages, Validator, toId } from "@recapp/models";
import { Unit, toTimestamp, unit } from "itu-utils";
import { actorUris } from "../actorUris";
import unionize, { UnionOf, ofType } from "unionize";
import { clone, keys } from "rambda";
import { Maybe, nothing, maybe } from "tsmonads";
import { ErrorMessages } from "./ErrorActor";
import { v4 } from "uuid";

export const SharingMessages = unionize(
	{
		AddExisting: ofType<Array<{ uid: Id; name: string }>>(),
		AddEntry: ofType<string>(),
		DeleteEntry: ofType<Id>(),
		Clear: {},
		Share: ofType<Quiz>(),
	},
	{ value: "value" }
);

export type SharingMessage = UnionOf<typeof SharingMessages>;

export type NotFoundError = { id: Id; queryNotFound: string };

export type SharedUser = { query: string; uid: Id; name: string };

export type SharingState = {
	teachers: SharedUser[];
	errors: NotFoundError[];
};

export class SharingActor extends StatefulActor<SharingMessage, Unit, SharingState> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { teachers: [], errors: [] };
	}

	public async receive(_from: ActorRef, message: SharingMessage): Promise<Unit> {
		SharingMessages.match(message, {
			AddExisting: list => {
				this.updateState(draft => {
					draft.teachers = [...draft.teachers, ...list.map(l => ({ ...l, query: "" }))];
				});
			},
			DeleteEntry: id => {
				this.updateState(draft => {
					draft.teachers = draft.teachers.filter(t => t.uid !== id);
				});
			},
			AddEntry: query => {
				this.ask<unknown, Id>(actorUris["UserStore"], UserStoreMessages.Find({ query, role: "TEACHER" })).then(
					(userOrError: any) => {
						console.log("FIND RESULT", userOrError);
						if (userOrError.uid) {
							this.updateState(draft => {
								draft.teachers = draft.teachers.filter(t => t.query !== query);
								draft.teachers.push({ query, uid: userOrError.uid, name: userOrError.username });
							});
						} else {
							this.updateState(draft => {
								draft.errors.push({ id: toId(v4()), queryNotFound: query });
							});
						}
					}
				);
			},
			Clear: () => {
				this.updateState(draft => {
					draft.teachers = draft.teachers.filter(t => !!t.uid);
				});
			},
			Share: quiz => {
				const teachers: Id[] = this.state.teachers.map(t => t.uid);
				console.warn(teachers, this.state.teachers, quiz.teachers);
				const students = quiz.students.filter(s => !teachers.includes(s));
				this.ask<unknown, Quiz>(
					actorUris["QuizActor"],
					QuizActorMessages.Update({ uid: quiz.uid, teachers, students })
				).catch(e => {
					this.send(actorUris["ErrorActor"], ErrorMessages.SetError(e));
				});
			},
		});
		return unit();
	}
}
