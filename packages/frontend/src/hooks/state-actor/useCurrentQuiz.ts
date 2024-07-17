import { keys } from "rambda";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessage, CurrentQuizState } from "../../actors/CurrentQuizActor";

// const setIsPresentationModeActive = (tryActor: Try<ActorRef> ,value: boolean) => {
// 	tryActor.forEach(actor =>
// 		actor.send(actor, CurrentQuizMessages.setIsPresentationModeActive(value))
// 	);
// };

export const useCurrentQuiz = () => {
    const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");

    const quizData = mbQuiz
        // if you are using normal map .. you will not be able to return undefined
        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
        .match(
            quizData => quizData,
            () => null
        );

    const quizActorSend = (message: CurrentQuizMessage) => {
        if (tryQuizActor.succeeded) {
            tryQuizActor.forEach(actor => actor.send(actor, message));
        } else {
            throw new Error("no actor present in useQuizData");
        }
    };

    return { quizData, quizActorSend, isQuizActorSucceeded: tryQuizActor.succeeded };
};
