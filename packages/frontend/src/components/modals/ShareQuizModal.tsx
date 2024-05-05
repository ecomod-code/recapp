import { FormEvent, useEffect, useRef, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { Id, Quiz } from "@recapp/models";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Alert from "react-bootstrap/Alert";
import CloseButton from "react-bootstrap/CloseButton";
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

    const errors: SharingState["errors"] = mbShare.map(s => s.errors).orElse([]);

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

    const onDeleteError = (errorId: Id) => {
        tryActor.forEach(actor => actor.send(actor, SharingMessages.DeleteError(errorId)));
    };

    const cancel = () => {
        setName("");
        handleClose();
    };

    const handleClose = () => {
        clear();
        onClose();
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        add();
    };

    return mbShare
        .map(s => s.teachers)
        .match(
            teachers => {
                return (
                    <Modal show={show} contentClassName="overflow-hidden" onEscapeKeyDown={cancel}>
                        <Modal.Title className="p-3 ps-3 text-bg-primary">
                            <Trans id="share-with-teachers-modal-title" />
                        </Modal.Title>
                        <Modal.Body>
                            {errors.map(error => (
                                <ErrorAlert key={error.id} error={error} onDeleteError={onDeleteError} />
                            ))}
                            <div className="p-2 mb-2 mt-2" style={{ minHeight: 48 }}>
                                {teachers.length === 0 && (
                                    <span style={{ color: "lightgray" }}>
                                        <Trans id="share-with-teachers-persons-to-add" />
                                    </span>
                                )}

                                <div className="d-flex flex-wrap gap-2">
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
                            <Form onSubmit={onSubmit}>
                                <Form.Group className="mt-3 d-flex flex-column flex-sm-row gap-2 border-top pt-3">
                                    <Form.Control
                                        className="border-secondary"
                                        value={name}
                                        autoFocus
                                        placeholder="ID, Email oder Pseudonym"
                                        onChange={event => {
                                            const name = event.target.value;
                                            setName(name);
                                        }}
                                    />
                                    <Button
                                        variant="warning"
                                        disabled={!name}
                                        type="submit"
                                        // onClick={add}
                                    >
                                        <Trans id="share-quiz-modal.button-label.add" />
                                    </Button>
                                </Form.Group>
                            </Form>
                        </Modal.Body>
                        <Modal.Footer>
                            <Form.Group className="flex-fill d-flex align-items-center justify-content-end flex-column-reverse flex-sm-row gap-2">
                                <Button variant="outline-primary" className="align-self-stretch" onClick={cancel}>
                                    <Trans id="cancel" />
                                </Button>

                                <Button variant="primary" className="align-self-stretch" onClick={share}>
                                    <Trans id="share-with-confirmed-users" />
                                </Button>
                            </Form.Group>
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
        <div key={teacher.uid} className="d-flex justify-content-start align-items-center border">
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

const ErrorAlert = ({
    error,
    onDeleteError,
}: {
    error: SharingState["errors"][number];
    onDeleteError: (errorId: Id) => void;
}) => {
    useEffect(() => {
        setTimeout(() => {
            onDeleteError(error.id);
        }, 2000);
    }, []);

    const onClick = () => {
        onDeleteError(error.id);
    };

    return (
        <>
            {error.alreadyExists ? (
                <Alert className="alert-info d-flex justify-content-between">
                    <span>
                        <strong>
                            <u>{error.alreadyExists}</u>
                        </strong>{" "}
                        <Trans id="share-quiz-modal.error-alert.already-exists" />
                    </span>

                    <CloseButton onClick={onClick} />
                </Alert>
            ) : null}

            {error.queryNotFound ? (
                <Alert className="alert-warning d-flex justify-content-between">
                    <span>
                        <strong>
                            <u>{error.queryNotFound}</u>
                        </strong>{" "}
                        <Trans id="share-quiz-modal.error-alert.do-not-exist" />
                    </span>
                    <CloseButton onClick={onClick} />
                </Alert>
            ) : null}
        </>
    );
};
