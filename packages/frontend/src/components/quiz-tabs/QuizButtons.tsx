import { useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe } from "tsmonads";
import { Trans } from "@lingui/react";
import { Quiz } from "@recapp/models";

import Button from "react-bootstrap/Button";
import { StopFill, Pencil, Play, QrCode } from "react-bootstrap-icons";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { YesNoModal } from "../modals/YesNoModal";
import { ShareModal } from "../modals/ShareModal";

export const QuizButtons = (props: { quizState: Quiz["state"]; uniqueLink: string }) => {
    const [shareModal, setShareModal] = useState("");
    const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");

    const [quizModeChange, setQuizModeChange] = useState<{
        titleId: string;
        textId: string;
        newMode: "EDITING" | "STARTED" | "STOPPED";
    }>({ titleId: "", textId: "", newMode: "EDITING" });

    const startQuizMode = () => {
        if (mbQuiz.flatMap(q => maybe(q.quiz?.state === "STOPPED")).orElse(false)) {
            setQuizModeChange({
                titleId: "title-set-quiz-mode-started",
                textId: "info-set-quiz-mode-started",
                newMode: "STARTED",
            });
        } else {
            setQuizModeChange({
                titleId: "title-set-quiz-mode-started",
                textId: "warning-set-quiz-mode-started",
                newMode: "STARTED",
            });
        }
    };

    const stopQuizMode = () => {
        setQuizModeChange({
            titleId: "title-set-quiz-mode-stopped",
            textId: "info-set-quiz-mode-stopped",
            newMode: "STOPPED",
        });
    };

    const editQuizMode = () => {
        setQuizModeChange({
            titleId: "title-set-quiz-mode-edit",
            textId: "info-set-quiz-mode-edit",
            newMode: "EDITING",
        });
    };

    const changeQuizMode = () => {
        tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ChangeState(quizModeChange.newMode)));
        setQuizModeChange({ textId: "", titleId: "", newMode: "EDITING" });
    };

    return (
        <>
            <ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />

            <YesNoModal
                show={!!quizModeChange.textId}
                onClose={() => setQuizModeChange({ textId: "", titleId: "", newMode: "EDITING" })}
                onSubmit={changeQuizMode}
                titleId={quizModeChange.titleId}
                textId={quizModeChange.textId}
            />

            <div className="row gap-2 justify-content-end flex-column-reverse flex-lg-row">
                <Button
                    variant="outline-primary"
                    className="ps-1 col-12 col-lg-auto d-flex justify-content-center align-items-center"
                    onClick={() => setShareModal(props.uniqueLink)}
                >
                    <QrCode className="mx-1" />
                    <Trans id="quiz-show-qr-code-button" />
                </Button>

                {props.quizState !== "EDITING" && (
                    <Button
                        variant="success"
                        className="ps-1 col-12 col-lg-auto d-flex justify-content-center align-items-center"
                        onClick={editQuizMode}
                    >
                        <Pencil className="mx-1" />
                        <Trans id="edit-quiz-button" />
                    </Button>
                )}

                {props.quizState !== "STOPPED" && (
                    <Button
                        variant="success"
                        className="ps-1 col-12 col-lg-auto d-flex justify-content-center align-items-center"
                        onClick={stopQuizMode}
                    >
                        <StopFill size={24} />
                        <Trans id="freeze-quiz-button" />
                    </Button>
                )}

                {props.quizState !== "STARTED" && (
                    <Button
                        variant="success"
                        className="col-12 col-lg-auto d-flex justify-content-center align-items-center"
                        onClick={startQuizMode}
                    >
                        <Play size={24} />
                        <span className="d-flex flex-nowrap">
                            <Trans id="start-quiz-mode-button" />
                        </span>
                    </Button>
                )}
            </div>
        </>
    );
};
