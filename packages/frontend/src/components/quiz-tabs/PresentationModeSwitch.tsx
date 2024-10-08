import { i18n } from "@lingui/core";
import Form from "react-bootstrap/Form";
import { useCurrentQuiz } from "../../hooks/state-actor/useCurrentQuiz";
import { useLocalUser } from "../../hooks/state-actor/useLocalUser";
import { CurrentQuizMessages } from "../../actors/CurrentQuizActor";
import { isInTeachersList, toId } from "@recapp/models";

export const PresentationModeSwitch = () => {
    const { quizData, quizActorSend } = useCurrentQuiz();
    const { localUser } = useLocalUser();

    const isPresentationModeActive = quizData?.isPresentationModeActive;

    const userId = localUser?.uid ?? toId("");
    const isUserInTeachersList = quizData ? isInTeachersList(quizData.quiz, userId) : false;

    if (!isUserInTeachersList) {
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
