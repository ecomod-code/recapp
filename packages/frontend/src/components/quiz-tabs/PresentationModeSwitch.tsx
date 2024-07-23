import { i18n } from "@lingui/core";
import Form from "react-bootstrap/Form";
import { useCurrentQuiz } from "../../hooks/state-actor/useCurrentQuiz";
import { useLocalUser } from "../../hooks/state-actor/useLocalUser";
import { checkIsQuizTeacher } from "../../utils";
import { CurrentQuizMessages } from "../../actors/CurrentQuizActor";

export const PresentationModeSwitch = () => {
    const { quizData, quizActorSend } = useCurrentQuiz();
    const { localUser } = useLocalUser();

    const isPresentationModeActive = quizData?.isPresentationModeActive;

    const isQuizTeacher = checkIsQuizTeacher(quizData, localUser);

    if (!isQuizTeacher) {
        return null;
    }

    return (
        <Form.Switch
            className="list-group-item ps-5 py-2"
            label={i18n._("quiz-stats-tab.switch-label.presentation-mode")}
            checked={!!isPresentationModeActive}
            onChange={() => {
                quizActorSend(CurrentQuizMessages.setIsPresentationModeActive(!isPresentationModeActive));
            }}
        />
    );
};
