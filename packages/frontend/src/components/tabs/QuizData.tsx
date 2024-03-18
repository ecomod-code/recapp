import { i18n } from "@lingui/core";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, Comment } from "@recapp/models";
import { Button, Form, InputGroup } from "react-bootstrap";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages } from "../../actors/CurrentQuizActor";
import { Pencil, Share } from "react-bootstrap-icons";
import { useState } from "react";
import { CreateGroupModal } from "../modals/CreateGroupModal";

export const QuizData: React.FC = () => {
	const [textEdit, setTextEdit] = useState({ element: "", value: "", show: false });
	const [mbQuiz, tryActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[] }>("CurrentQuiz");

	const update = (q: Partial<Quiz>) => tryActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update(q)));

	return mbQuiz
		.flatMap(q => (!!q.quiz.uid ? maybe(q.quiz) : nothing()))
		.match(
			quiz => {
				return (
					<Form>
						<CreateGroupModal
							show={textEdit.show}
							invalidValues={[]}
							onClose={() => setTextEdit({ element: "", value: "", show: false })}
							onSubmit={name => {
								const delta: Record<string, unknown> = {};
								delta[textEdit.element] = name;
								update(delta);
								setTextEdit({ element: "", value: "", show: false });
							}}
							defaultValue={textEdit.value}
						/>
						<Form.Group className="mb-2">
							<Form.Text>Titel</Form.Text>
							<InputGroup>
								<Form.Control type="text" value={quiz.title} disabled />
								<div>
									<Button
										onClick={() => {
											setTextEdit({ element: "title", value: quiz.title, show: true });
										}}
									>
										<Pencil />
									</Button>
								</div>
							</InputGroup>
						</Form.Group>
						<Form.Group>
							<Form.Text>Beschreibung</Form.Text>
							<InputGroup>
								<Form.Control
									className="mb-2"
									type="textarea"
									as="textarea"
									rows={5}
									value={quiz.description}
									disabled
								/>
								<div className="d-flex flex-column justify-content-end">
									<Button
										className="flex-grow-0 mb-2"
										onClick={() => {
											setTextEdit({
												element: "description",
												value: quiz.description,
												show: true,
											});
										}}
									>
										<Pencil />
									</Button>
								</div>
							</InputGroup>
						</Form.Group>
						<Form.Group className="mb-2">
							<Form.Text>Anzahl Teilnehmende</Form.Text>
							<Form.Control type="text" value={quiz.students?.length ?? 0} disabled />
						</Form.Group>
						<Form.Group className="mb-2">
							<Form.Text>Lehrpersonen mit Zugriff</Form.Text>
							<InputGroup>
								<Form.Control type="text" value={(quiz.teachers ?? []).join(", ")} disabled />
								<div>
									<Button>
										<Share />
									</Button>
								</div>
							</InputGroup>
						</Form.Group>
						<Form.Switch
							className="mb-2"
							label={i18n._("quiz-allows-student-comments")}
							checked={quiz.studentComments}
							onChange={event => update({ studentComments: event.target.checked })}
						/>
						<Form.Switch
							className="mb-2"
							label={i18n._("quiz-allows-student-questions")}
							checked={quiz.studentQuestions}
							onChange={event => update({ studentQuestions: event.target.checked })}
						/>
						<Form.Group className="mb-2">
							<Form.Label>{i18n._("quiz-student-participation")}</Form.Label>
							<Form.Switch
								className="ms-2"
								label={i18n._("quiz-allows-anonymous-participation")}
								checked={quiz.studentParticipationSettings.ANONYMOUS}
								onChange={event => {
									console.log(event.target);
									const values = quiz.studentParticipationSettings;
									values.ANONYMOUS = event.target.checked;
									update({ studentParticipationSettings: values });
								}}
							/>
							<Form.Switch
								className="ms-2"
								label={i18n._("quiz-allows-participation-via-nickname")}
								checked={quiz.studentParticipationSettings.NICKNAME}
								onChange={event => {
									const values = quiz.studentParticipationSettings;
									values.NICKNAME = event.target.checked;
									update({ studentParticipationSettings: values });
								}}
							/>
							<Form.Switch
								className="ms-2"
								label={i18n._("quiz-allows-participation-via-realname")}
								checked={quiz.studentParticipationSettings.NAME}
								onChange={event => {
									const values = quiz.studentParticipationSettings;
									values.NAME = event.target.checked;
									update({ studentParticipationSettings: values });
								}}
							/>
						</Form.Group>
						<Form.Group className="mb-2">
							<Form.Label>{i18n._("quiz-allowed-question-types")}</Form.Label>
							<Form.Switch
								className="ms-2"
								label={i18n._("quiz-allows-text-questions")}
								checked={quiz.allowedQuestionTypesSettings.TEXT}
								onChange={event => {
									const values = quiz.allowedQuestionTypesSettings;
									values.TEXT = event.target.checked;
									update({ allowedQuestionTypesSettings: values });
								}}
							/>
							<Form.Switch
								className="ms-2"
								label={i18n._("quiz-allows-single-choice-questions")}
								checked={quiz.allowedQuestionTypesSettings.SINGLE}
								onChange={event => {
									const values = quiz.allowedQuestionTypesSettings;
									values.SINGLE = event.target.checked;
									update({ allowedQuestionTypesSettings: values });
								}}
							/>
							<Form.Switch
								className="ms-2"
								label={i18n._("quiz-allows-multiple-choice-realname")}
								checked={quiz.allowedQuestionTypesSettings.MULTIPLE}
								onChange={event => {
									const values = quiz.allowedQuestionTypesSettings;
									values.MULTIPLE = event.target.checked;
									update({ allowedQuestionTypesSettings: values });
								}}
							/>
						</Form.Group>
						<Form.Switch
							className="mb-2"
							label={i18n._("quiz-enable-question-shufflling")}
							checked={quiz.shuffleQuestions}
							onChange={event => update({ shuffleQuestions: event.target.checked })}
						/>
					</Form>
				);
			},
			() => null
		);
};
