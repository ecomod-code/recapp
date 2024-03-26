import React, { useContext } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { SystemContext, useStatefulActor } from "ts-actors-react";
import { Breadcrumb, Button, Container, Form, Row } from "react-bootstrap";
import { validationOkay } from "@recapp/models";
import { CreateQuizMessages, CreateQuizState } from "../actors/CreateQuizActor";
import { useNavigate } from "react-router-dom";
import { flattenSystem } from "../utils";
import { actorUris } from "../actorUris";

export const CreateQuiz: React.FC = () => {
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
							<Breadcrumb.Item>{i18n._("new-quiz")}</Breadcrumb.Item>
						</Breadcrumb>
						<Container>
							<Form>
								<Form.Group className="mb-2">
									<Form.Control
										type="text"
										placeholder={i18n._("quiz-title")}
										value={quiz.title}
										onChange={event =>
											actor.send(actor, CreateQuizMessages.Update({ title: event.target.value }))
										}
									/>
									<Form.Text className="ms-2">
										{validation.title ? (
											<>&nbsp;</>
										) : (
											<span className="text-danger">{i18n._("error-quiz-title-too-short")}</span>
										)}
									</Form.Text>
								</Form.Group>
								<Form.Control
									className="mb-2"
									type="textarea"
									as="textarea"
									rows={5}
									placeholder={i18n._("quiz-description")}
									value={quiz.description}
									onChange={event =>
										actor.send(
											actor,
											CreateQuizMessages.Update({ description: event.target.value })
										)
									}
								/>
								<Form.Switch
									className="mb-2"
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
									className="mb-2"
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
								<Form.Group className="mb-2">
									<Form.Label>{i18n._("quiz-student-participation")}</Form.Label>
									<Form.Switch
										className="ms-2"
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
										className="ms-2"
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
										className="ms-2"
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
								</Form.Group>
								<Form.Group className="mb-2">
									<Form.Label>{i18n._("quiz-allowed-question-types")}</Form.Label>
									<Form.Switch
										className="ms-2"
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
										className="ms-2"
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
										className="ms-2"
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
								</Form.Group>
								<Form.Switch
									className="mb-2"
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
								<Button
									variant="primary"
									className="mt-2"
									disabled={!validationOkay(validation)}
									onClick={createQuiz}
								>
									<Trans id="create-quiz-button" />
								</Button>
							</Form>
						</Container>
					</Row>
				</Container>
			);
		},
		() => null
	);
};
