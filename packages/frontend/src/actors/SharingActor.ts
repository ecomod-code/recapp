import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { Id, Quiz, QuizActorMessages, UserStoreMessages, toId } from "@recapp/models";
import { Unit, unit } from "itu-utils";
import { actorUris } from "../actorUris";
import unionize, { UnionOf, ofType } from "unionize";
import { ErrorMessages } from "./ErrorActor";
import { v4 } from "uuid";

export const SharingMessages = unionize(
	{
		AddExisting: ofType<Array<{ uid: Id; name: string }>>(),
		AddEntry: ofType<string>(),
		DeleteEntry: ofType<Id>(),
		Clear: {},
		DeleteError: ofType<Id>(),
		Share: ofType<Quiz>(),
	},
	{ value: "value" }
);

export type SharingMessage = UnionOf<typeof SharingMessages>;

export type NotFoundError = { id: Id; queryNotFound: string; alreadyExists?: never };
export type AlreadyExists = { id: Id; queryNotFound?: never; alreadyExists: string };

export type SharedUser = { query: string; uid: Id; name: string };

export type SharingState = {
	teachers: SharedUser[];
    errors: (NotFoundError | AlreadyExists)[];
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
			DeleteError: id => {
				this.updateState(draft => {
					draft.errors = draft.errors.filter(error => error.id !== id);
				});
			},
			AddEntry: query => {
				this.ask<unknown, Id>(actorUris["UserStore"], UserStoreMessages.Find({ query, role: "TEACHER" }))
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .then((userOrError: any) => {
						console.log("FIND RESULT", userOrError);
						if (userOrError.uid) {
                            this.updateState(draft => {
                                const isAlreadyExists = draft.teachers.some(x => x.uid === userOrError.uid);
                                if (isAlreadyExists) {
									draft.errors.push({ id: toId(v4()), alreadyExists: query });
                                } else {
                                    // draft.teachers = draft.teachers.filter(t => t.query !== query);
                                    draft.teachers = draft.teachers.filter(t => t.uid !== userOrError.uid);
                                    draft.teachers.push({ query, uid: userOrError.uid, name: userOrError.username });
                                }
                            });
						} else {
							this.updateState(draft => {
								draft.errors.push({ id: toId(v4()), queryNotFound: query });
							});
						}
					});
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
