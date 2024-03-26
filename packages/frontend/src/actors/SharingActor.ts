import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { Id, Quiz, QuizActorMessages, UserStoreMessages, Validator } from "@recapp/models";
import { Unit, toTimestamp, unit } from "itu-utils";
import { actorUris } from "../actorUris";
import unionize, { UnionOf, ofType } from "unionize";
import { clone, keys } from "rambda";
import { Maybe, nothing, maybe } from "tsmonads";
import { ErrorMessages } from "./ErrorActor";

export const SharingMessages = unionize(
	{
		SetQuiz: ofType<Quiz>(),
		AddEntry: ofType<string>(),
		Share: {},
	},
	{ value: "value" }
);

export type SharingMessage = UnionOf<typeof SharingMessages>;

export type SharedUser = { query: string; uid?: Id };

export type SharingState = { quiz: Maybe<Quiz>; teachers: SharedUser[] };

export class SharingActor extends StatefulActor<SharingMessage, Unit, SharingState> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { quiz: nothing(), teachers: [] };
	}

	public async receive(_from: ActorRef, message: SharingMessage): Promise<Unit> {
		SharingMessages.match(message, {
			SetQuiz: quiz => {
				this.updateState(draft => {
					draft.quiz = maybe(quiz);
					draft.teachers = [];
				});
			},
			AddEntry: query => {
				this.updateState(draft => {
					draft.teachers = [...draft.teachers, { query }];
				});
				this.ask<unknown, Id>(actorUris["UserStore"], UserStoreMessages.Find({ query, role: "TEACHER" })).then(
					uid => {
						console.log("FIND RESULT", uid);
						if (uid) {
							this.updateState(draft => {
								draft.teachers = draft.teachers.filter(t => t.query !== query);
								draft.teachers.push({ query, uid });
							});
						}
					}
				);
			},
			Share: () => {
				this.state.quiz.match(
					q => {
						const teachers: Id[] = [
							...q.teachers,
							...(this.state.teachers.map(t => t.uid).filter(Boolean) as Id[]),
						];
						this.ask<unknown, Quiz>(
							actorUris["QuizActor"],
							QuizActorMessages.Update({ uid: q.uid, teachers })
						).catch(e => {
							this.send(actorUris["ErrorActor"], ErrorMessages.SetError(e));
						});
					},
					() => {
						console.error("No quiz set");
					}
				);
			},
		});
		return unit();
	}
}
