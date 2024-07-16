import { i18n } from "@lingui/core";
import { keys } from "rambda";
import { Maybe, maybe, nothing } from "tsmonads";
import { useStatefulActor } from "ts-actors-react";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import Form from "react-bootstrap/Form";
import { toId, User } from "@recapp/models";

export const PresentationModeSwitch = () => {
    const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
    const [mbLocalUser] = useStatefulActor<{ user: User }>("LocalUser");

    const isPresentationModeActive = mbQuiz
        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
        .match(
            quizData => quizData.isPresentationModeActive,
            () => null
        );

    const teachers: string[] = mbQuiz.flatMap(q => maybe(q.quiz?.teachers)).orElse([]);
    const localUser: Maybe<User> = mbLocalUser.flatMap(u => (keys(u.user).length > 0 ? maybe(u.user) : nothing()));
    const isTeacher = teachers.includes(localUser.map(u => u.uid).orElse(toId("")));

    if (!isTeacher) {
        return null;
    }

    return (
        <Form.Switch
            className="list-group-item ps-5 py-2"
            label={i18n._("quiz-stats-tab.switch-label.presentation-mode")}
            checked={!!isPresentationModeActive}
            onChange={() => {
                tryQuizActor.forEach(actor =>
                    actor.send(actor, CurrentQuizMessages.setIsPresentationModeActive(!isPresentationModeActive))
                );
            }}
        />
    );
};
