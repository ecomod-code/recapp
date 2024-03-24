import { ActorRef, ActorSystem } from "ts-actors";
import { StatefulActor } from "ts-actors-react";
import { Id, Quiz, QuizActorMessages, Validator } from "@recapp/models";
import { Unit, toTimestamp, unit } from "itu-utils";
import { actorUris } from "../actorUris";
import unionize, { UnionOf, ofType } from "unionize";
import { clone, keys } from "rambda";

export type NewQuiz = Omit<Quiz, "uniqueLink" | "uid" | "created" | "updated">;
export const CreateQuizMessages = unionize(
	{
		Update: ofType<Partial<NewQuiz>>(),
		CreateQuiz: {},
		ResetData: {},
	},
	{ value: "value" }
);

export type CreateQuizMessage = UnionOf<typeof CreateQuizMessages>;

const newQuiz: NewQuiz = {
	title: "",
	description: "",
	studentComments: true,
	studentQuestions: true,
	comments: [],
	studentParticipationSettings: {
		ANONYMOUS: true,
		NAME: true,
		NICKNAME: true,
	},
	allowedQuestionTypesSettings: {
		MULTIPLE: true,
		SINGLE: true,
		TEXT: true,
	},
	shuffleQuestions: true,
	teachers: [],
	students: [],
	groups: [],
	state: "ACTIVE",
};

const startValidation: Validator<NewQuiz> = {
	title: true,
	description: true,
	comments: true,
	studentComments: true,
	studentQuestions: true,
	studentParticipationSettings: true,
	allowedQuestionTypesSettings: true,
	shuffleQuestions: true,
	teachers: true,
	students: true,
	groups: true,
	state: true,
};

export type CreateQuizState = { quiz: NewQuiz; validation: Validator<NewQuiz> };

export class CreateQuizActor extends StatefulActor<CreateQuizMessage, Unit | Error | Id, CreateQuizState> {
	constructor(name: string, system: ActorSystem) {
		super(name, system);
		this.state = { quiz: clone(newQuiz), validation: clone(startValidation) };
	}

	private validate = (q: NewQuiz): Validator<NewQuiz> => {
		const validation = { ...this.state.validation };
		validation.title = q.title.length > 3;
		return validation;
	};

	private okay = (): boolean => {
		const validationKeys = keys(this.state.validation);
		for (const k of validationKeys) {
			if (!this.state.validation[k]) return false;
		}
		return true;
	};

	public async receive(_from: ActorRef, message: CreateQuizMessage): Promise<Error | Unit | Id> {
		return CreateQuizMessages.match<Promise<Error | Unit | Id>>(message, {
			Update: async partialQuiz => {
				this.updateState(draft => {
					draft.quiz = { ...draft.quiz, ...partialQuiz };
					draft.validation = this.validate(draft.quiz);
				});
				return unit();
			},
			CreateQuiz: async () => {
				try {
					if (!this.okay()) return new Error("Quiz not validated yet");
					const teacher: Id = await this.ask(actorUris["LocalUser"], "uid");
					const quizData: Omit<Quiz, "uid" | "uniqueLink"> = {
						...this.state.quiz,
						groups: [{ name: "DEFAULT", questions: [] }],
						teachers: [teacher],
						comments: [],
						created: toTimestamp(),
						updated: toTimestamp(),
					};
					const uid: Id = await this.ask(actorUris.QuizActor, QuizActorMessages.Create(quizData));
					this.send(this.actorRef!, CreateQuizMessages.ResetData());
					return uid;
				} catch (e) {
					console.error(e);
					if (e instanceof Error) return e;
					else return new Error("Unknown error");
				}
			},
			ResetData: async () => {
				this.updateState(draft => {
					draft.quiz = clone(newQuiz);
					draft.validation = clone(startValidation);
				});
				return unit();
			},
		});
	}
}
