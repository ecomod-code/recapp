import React, { useContext, useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { useNavigate } from "react-router-dom";
import { SystemContext, useStatefulActor } from "ts-actors-react";

import Breadcrumb from "react-bootstrap/Breadcrumb";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import { ListGroupContainer } from "../components/ListGroupContainer";

import { CreateQuizMessages, CreateQuizState } from "../actors/CreateQuizActor";
import { actorUris } from "../actorUris";
import { validationOkay } from "@recapp/models";
import { flattenSystem } from "../utils";
import { CharacterTracker } from "../components/CharacterTracker";
import { DESCRIPTION_MAX_CHARACTERS, TITLE_MAX_CHARACTERS } from "../constants/constants";

export const CreateQuiz: React.FC = () => {
    const [titleAndDescription, setTitleAndDescription] = useState({ title: "", description: "" });
    const nav = useNavigate();
    const tSystem = useContext(SystemContext);
    const [mbState, tActor] = useStatefulActor<CreateQuizState>("CreateQuiz");
    return flattenSystem(tSystem, tActor, mbState).match(
        ([system, actor, state]) => {
            const createQuiz = async () => {
                const uid = await system.ask(actorUris["CreateQuiz"], CreateQuizMessages.CreateQuiz());
                nav({ pathname: "/Dashboard/Quiz" }, { state: { quizId: uid } });
            };
            const { quiz, validation } = state;
            return (
                <Container fluid>
                    <Row>
                        <Breadcrumb>
                            <Breadcrumb.Item href="/Dashboard">Dashboard</Breadcrumb.Item>
                            <Breadcrumb.Item active>{i18n._("new-quiz")}</Breadcrumb.Item>
                        </Breadcrumb>
                        <Container className="pb-5">
                            <div className="list-group">
                                <Form.Group className="mb-1">
                                    <CharacterTracker value={quiz.title.length} maxValue={TITLE_MAX_CHARACTERS} />
                                    <Form.Control
                                        type="text"
                                        placeholder={i18n._("quiz-title")}
                                        // value={quiz.title}
                                        value={titleAndDescription.title ? titleAndDescription.title : quiz.title}
                                        onChange={event => {
                                            const value = event.target.value;
                                            const isTextTooLong = value.length >= TITLE_MAX_CHARACTERS;
                                            const text = isTextTooLong ? value?.slice(0, TITLE_MAX_CHARACTERS) : value;

                                            setTitleAndDescription(prev => ({ ...prev, title: text }));

                                            return actor.send(
                                                actor,
                                                // CreateQuizMessages.Update({ title: event.target.value })
                                                CreateQuizMessages.Update({ title: text })
                                            );
                                        }}
                                    />
                                    <Form.Text className="ms-2">
                                        {validation.title ? (
                                            <>&nbsp;</>
                                        ) : (
                                            <span className="text-danger">{i18n._("error-quiz-title-too-short")}</span>
                                        )}
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group>
                                    <CharacterTracker
                                        value={quiz.description.length}
                                        maxValue={DESCRIPTION_MAX_CHARACTERS}
                                    />
                                    <Form.Control
                                        type="textarea"
                                        as="textarea"
                                        rows={5}
                                        placeholder={i18n._("quiz-description")}
                                        // value={quiz.description}
                                        value={titleAndDescription.description ? titleAndDescription.description : quiz.description}
                                        onChange={event => {
                                            const value = event.target.value;
                                            const isTextTooLong = value.length >= DESCRIPTION_MAX_CHARACTERS;
                                            const text = isTextTooLong
                                                ? value?.slice(0, DESCRIPTION_MAX_CHARACTERS)
                                                : value;
                                                
                                            setTitleAndDescription(prev => ({ ...prev, description: text }));

                                            return actor.send(
                                                actor,
                                                // CreateQuizMessages.Update({ description: event.target.value })
                                                CreateQuizMessages.Update({ description: text })
                                            );
                                        }}
                                    />
                                </Form.Group>

                                <ListGroupContainer>
                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-student-comments")}
                                        checked={quiz.studentComments}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({ studentComments: event.target.checked })
                                            )
                                        }
                                    />

                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-student-questions")}
                                        checked={quiz.studentQuestions}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    studentQuestions: event.target.checked,
                                                })
                                            )
                                        }
                                    />
                                </ListGroupContainer>

                                <ListGroupContainer header={i18n._("quiz-student-participation")}>
                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-anonymous-participation")}
                                        checked={quiz.studentParticipationSettings.ANONYMOUS}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    studentParticipationSettings: {
                                                        ...quiz.studentParticipationSettings,
                                                        ANONYMOUS: event.target.checked,
                                                    },
                                                })
                                            )
                                        }
                                    />

                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-participation-via-nickname")}
                                        checked={quiz.studentParticipationSettings.NICKNAME}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    studentParticipationSettings: {
                                                        ...quiz.studentParticipationSettings,
                                                        NICKNAME: event.target.checked,
                                                    },
                                                })
                                            )
                                        }
                                    />

                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-participation-via-realname")}
                                        checked={quiz.studentParticipationSettings.NAME}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    studentParticipationSettings: {
                                                        ...quiz.studentParticipationSettings,
                                                        NAME: event.target.checked,
                                                    },
                                                })
                                            )
                                        }
                                    />
                                </ListGroupContainer>

                                <ListGroupContainer header={i18n._("quiz-allowed-question-types")}>
                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-text-questions")}
                                        checked={quiz.allowedQuestionTypesSettings.TEXT}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    allowedQuestionTypesSettings: {
                                                        ...quiz.allowedQuestionTypesSettings,
                                                        TEXT: event.target.checked,
                                                    },
                                                })
                                            )
                                        }
                                    />

                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-single-choice-questions")}
                                        checked={quiz.allowedQuestionTypesSettings.SINGLE}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    allowedQuestionTypesSettings: {
                                                        ...quiz.allowedQuestionTypesSettings,
                                                        SINGLE: event.target.checked,
                                                    },
                                                })
                                            )
                                        }
                                    />

                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-allows-multiple-choice-realname")}
                                        checked={quiz.allowedQuestionTypesSettings.MULTIPLE}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    allowedQuestionTypesSettings: {
                                                        ...quiz.allowedQuestionTypesSettings,
                                                        MULTIPLE: event.target.checked,
                                                    },
                                                })
                                            )
                                        }
                                    />
                                </ListGroupContainer>

                                <ListGroupContainer>
                                    <Form.Switch
                                        className="list-group-item ps-5"
                                        label={i18n._("quiz-enable-question-shufflling")}
                                        checked={quiz.shuffleQuestions}
                                        onChange={event =>
                                            actor.send(
                                                actor,
                                                CreateQuizMessages.Update({
                                                    shuffleQuestions: event.target.checked,
                                                })
                                            )
                                        }
                                    />
                                </ListGroupContainer>
                                <Button
                                    variant="primary"
                                    className="mt-4"
                                    disabled={!validationOkay(validation)}
                                    onClick={createQuiz}
                                >
                                    <Trans id="create-quiz-button" />
                                </Button>
                            </div>
                        </Container>
                    </Row>
                </Container>
            );
        },
        () => null
    );
};
