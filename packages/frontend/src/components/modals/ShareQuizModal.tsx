import { useEffect, useRef, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { Quiz } from "@recapp/models";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { X } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { SharedUser, SharingMessages, SharingState } from "../../actors/SharingActor";
import { CurrentQuizState } from "../../actors/CurrentQuizActor";

interface Props {
    quiz: Quiz;
    show: boolean;
    onClose: () => void;
}

export const ShareQuizModal: React.FC<Props> = ({ quiz, show, onClose }) => {
    const [name, setName] = useState("");
    const [mbQuiz] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
    const [mbShare, tryActor] = useStatefulActor<SharingState>("QuizSharing");
    const firstRenderRef = useRef(true);

    const tNames: string[] = mbQuiz.map(s => s.teacherNames).orElse([]);

    useEffect(() => {
        if (!firstRenderRef.current) {
            return;
        }
        if (!quiz.teachers || !tNames) {
            return;
        }
        if (quiz.teachers.length !== tNames.length) {
            return;
        }

        const teachersRecords = quiz.teachers.map((x, i) => {
            return {
                uid: x,
                name: tNames[i],
            };
        });

        clear();
        tryActor.forEach(actor => actor.send(actor, SharingMessages.AddExisting(teachersRecords)));
        firstRenderRef.current = false;
    }, [quiz.teachers, tNames]);

    const add = () => {
        tryActor.forEach(actor => actor.send(actor, SharingMessages.AddEntry(name)));
        setName("");
    };

    const share = () => {
        tryActor.forEach(actor => actor.send(actor, SharingMessages.Share(quiz)));
        setName("");
        handleClose();
    };

    const clear = () => {
        tryActor.forEach(actor => actor.send(actor, SharingMessages.Clear()));
    };

    const onDeleteTeacher = (teacher: SharedUser) => {
        tryActor.forEach(actor => actor.send(actor, SharingMessages.DeleteEntry(teacher.uid)));
    };

    const cancel = () => {
        setName("");
        handleClose();
    };

    const handleClose = () => {
        clear();
        onClose();
    };

    return mbShare
        .map(s => s.teachers)
        .match(
            teachers => {
                return (
                    <Modal show={show}>
                        <Modal.Title className="p-1 ps-2 text-bg-primary">
                            <Trans id="share-with-teachers-modal-title" />
                        </Modal.Title>
                        <Modal.Body>
                            <div className="mb-2 mt-2" style={{ minHeight: 48 }}>
                                {teachers.length === 0 && (
                                    <span style={{ color: "lightgray" }}>
                                        <Trans id="share-with-teachers-persons-to-add" />
                                    </span>
                                )}

                                <div className="d-flex flex-wrap">
                                    {teachers.map((t, i) => {
                                        const isQuizCreator = i === 0;
                                        return (
                                            <TeacherTag
                                                key={t.uid}
                                                isButtonVisible={!isQuizCreator}
                                                teacher={t}
                                                onClick={() => onDeleteTeacher(t)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                            <Form.Control
                                value={name}
                                placeholder="ID, Email oder Pseudonym"
                                onChange={event => {
                                    const name = event.target.value;
                                    setName(name);
                                }}
                            />
                            <Button variant="primary" onClick={add} className="mt-4">
                                <Trans id="share-quiz-modal.button-label.add" />
                            </Button>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="primary" onClick={share}>
                                <Trans id="share-with-confirmed-users" />
                            </Button>
                            <Button variant="warning" onClick={cancel}>
                                <Trans id="cancel" />
                            </Button>
                        </Modal.Footer>
                    </Modal>
                );
            },
            () => null
        );
};

const TeacherTag = ({
    teacher,
    isButtonVisible,
    onClick,
}: {
    teacher: SharedUser;
    isButtonVisible: boolean;
    onClick: () => void;
}) => {
    return (
        <div key={teacher.uid} className="d-flex justify-content-start align-items-center me-2 border">
            {isButtonVisible ? (
                <ButtonWithTooltip
                    title={i18n._("share-quiz-modal.button-tooltip.clear")}
                    variant="light"
                    className="m-0 p-0 h-100 rounded-0"
                    onClick={onClick}
                >
                    <X size={24} />
                </ButtonWithTooltip>
            ) : null}

            <span style={{ padding: "6px 10px" }}>{teacher.name}</span>
        </div>
    );
};
