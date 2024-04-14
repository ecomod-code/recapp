import { PropsWithChildren, useState } from "react";
import { i18n } from "@lingui/core";
import { useStatefulActor } from "ts-actors-react";
import { Quiz } from "@recapp/models";
import { maybe, nothing } from "tsmonads";
import { toTimestamp } from "itu-utils";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Pencil, Share } from "react-bootstrap-icons";
import { TextModal } from "../modals/TextModal";

import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { YesNoModal } from "../modals/YesNoModal";
import { ListGroupContainer } from "../ListGroupContainer";
import { Trans } from "@lingui/react";
import axios from "axios";
import { QuizExportModal } from "../modals/QuizExportModal";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { ShareQuizModal } from "../modals/ShareQuizModal";

export const QuizDataTab: React.FC = () => {
	const [textEdit, setTextEdit] = useState({ element: "", value: "", show: false, title: "" });
	const [shareModal, setShareModal] = useState(false);
	const [archiveModal, setArchiveModal] = useState(false);
	const [quizModeChange, setQuizModeChange] = useState<{
		titleId: string;
		textId: string;
		newMode: "EDITING" | "STARTED" | "STOPPED";
	}>({ titleId: "", textId: "", newMode: "EDITING" });
	const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const [showExportModal, setShowExportModal] = useState(false);

	const update = (q: Partial<Quiz>) => tryActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update(q)));

	const closeShare = () => {
		setShareModal(false);
	};

	const tNames = mbQuiz.map(s => s.teacherNames.join(", ")).orElse("");

	const startExport = () => {
		setShowExportModal(true);
		tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.Export()));
	};

	const cancelExport = () => {
		setShowExportModal(false);
		tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportDone()));
	};

	const downloadExport = (filename: string) => {
		setShowExportModal(false);
		tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportDone()));
		axios
			.get(`${import.meta.env.VITE_BACKEND_URI}/download/${filename}`, {
				responseType: "blob",
			})
			.then(response => {
				const url = window.URL.createObjectURL(response.data);
				const a = document.createElement("a");
				a.href = url;
				a.download = filename;
				a.click();
			});
	};

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

	return mbQuiz
		.flatMap(q => (q.quiz.uid ? maybe(q.quiz) : nothing()))
		.match(
			quiz => {
				const archive = () => {
					tryActor.forEach(actor => {
						actor.send(actor, CurrentQuizMessages.Update({ uid: quiz.uid, archived: toTimestamp() }));
					});
					setArchiveModal(false);
				};
				const disabledByMode = quiz.state !== "EDITING";
				const fn = mbQuiz.flatMap(q => maybe(q.exportFile)).orUndefined();
				return (
					<Form>
						<QuizExportModal
							show={showExportModal}
							filename={fn}
							onClose={cancelExport}
							onDownload={downloadExport}
						/>
						<ShareQuizModal show={shareModal} onClose={closeShare} quiz={quiz} />
						<YesNoModal
							show={archiveModal}
							onClose={() => setArchiveModal(false)}
							onSubmit={archive}
							titleId="archive-quiz-title"
							textId="archive-quiz-title"
						/>
						<YesNoModal
							show={!!quizModeChange.textId}
							onClose={() => setQuizModeChange({ textId: "", titleId: "", newMode: "EDITING" })}
							onSubmit={changeQuizMode}
							titleId={quizModeChange.titleId}
							textId={quizModeChange.textId}
						/>
						<TextModal
							show={textEdit.show}
							onClose={() => setTextEdit({ element: "", value: "", show: false, title: "" })}
							onSubmit={name => {
								const delta: Record<string, unknown> = {};
								delta[textEdit.element] = name;
								update(delta);
								setTextEdit({ element: "", value: "", show: false, title: "" });
							}}
							titleId={textEdit.title}
							editorValue={textEdit.value}
						/>
						<div className="d-flex flex-direction-row">
							{quiz.state !== "STARTED" && (
								<>
									<Button variant="success" onClick={startQuizMode}>
										<Trans id="start-quiz-mode-button" />
									</Button>
									&nbsp;
								</>
							)}
							{quiz.state !== "STOPPED" && (
								<>
									<Button variant="success" onClick={stopQuizMode}>
										<Trans id="freeze-quiz-button" />
									</Button>
									&nbsp;
								</>
							)}
							{quiz.state !== "EDITING" && (
								<>
									<Button variant="success" onClick={editQuizMode}>
										<Trans id="edit-quiz-button" />
									</Button>
									&nbsp;
								</>
							)}
						</div>

						<ContainerWithHeaderBar
							label={i18n._("new-quiz-title")}
							editButton={{
								onClick: () =>
									setTextEdit({
										element: "title",
										value: quiz.title,
										show: true,
										title: "new-quiz-title",
									}),
								isDisabled: disabledByMode,
							}}
						>
							<Form.Control type="text" value={quiz.title} disabled />
						</ContainerWithHeaderBar>

						<ContainerWithHeaderBar
							label={i18n._("quiz-description")}
							editButton={{
								onClick: () =>
									setTextEdit({
										element: "description",
										value: quiz.description,
										show: true,
										title: "quiz-description",
									}),
								isDisabled: disabledByMode,
							}}
						>
							<Form.Control type="textarea" as="textarea" rows={5} value={quiz.description} disabled />
						</ContainerWithHeaderBar>

						<ContainerWithHeaderBar label={i18n._("number-of-participants")}>
							<Form.Control type="text" value={quiz.students?.length ?? 0} disabled />
						</ContainerWithHeaderBar>

						<ContainerWithHeaderBar
							label={i18n._("teachers")}
							shareButton={{
								onClick: () => setShareModal(true),
								isDisabled: disabledByMode,
							}}
						>
							<Form.Control type="text" value={tNames} disabled />
						</ContainerWithHeaderBar>

						<ListGroupContainer>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-student-comments")}
								checked={quiz.studentComments}
								onChange={event => update({ studentComments: event.target.checked })}
								disabled={disabledByMode}
							/>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-student-questions")}
								checked={quiz.studentQuestions}
								onChange={event => update({ studentQuestions: event.target.checked })}
								disabled={disabledByMode}
							/>
						</ListGroupContainer>

						<ListGroupContainer header={i18n._("quiz-student-participation")}>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-anonymous-participation")}
								checked={quiz.studentParticipationSettings.ANONYMOUS}
								disabled={disabledByMode}
								onChange={event => {
									console.log(event.target);
									const values = quiz.studentParticipationSettings;
									values.ANONYMOUS = event.target.checked;
									update({ studentParticipationSettings: values });
								}}
							/>

							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-participation-via-nickname")}
								checked={quiz.studentParticipationSettings.NICKNAME}
								disabled={disabledByMode}
								onChange={event => {
									const values = quiz.studentParticipationSettings;
									values.NICKNAME = event.target.checked;
									update({ studentParticipationSettings: values });
								}}
							/>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-participation-via-realname")}
								checked={quiz.studentParticipationSettings.NAME}
								disabled={disabledByMode}
								onChange={event => {
									const values = quiz.studentParticipationSettings;
									values.NAME = event.target.checked;
									update({ studentParticipationSettings: values });
								}}
							/>
						</ListGroupContainer>

						<ListGroupContainer header={i18n._("quiz-allowed-question-types")}>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-text-questions")}
								checked={quiz.allowedQuestionTypesSettings.TEXT}
								disabled={disabledByMode}
								onChange={event => {
									const values = quiz.allowedQuestionTypesSettings;
									values.TEXT = event.target.checked;
									update({ allowedQuestionTypesSettings: values });
								}}
							/>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-single-choice-questions")}
								checked={quiz.allowedQuestionTypesSettings.SINGLE}
								disabled={disabledByMode}
								onChange={event => {
									const values = quiz.allowedQuestionTypesSettings;
									values.SINGLE = event.target.checked;
									update({ allowedQuestionTypesSettings: values });
								}}
							/>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-allows-multiple-choice-realname")}
								checked={quiz.allowedQuestionTypesSettings.MULTIPLE}
								disabled={disabledByMode}
								onChange={event => {
									const values = quiz.allowedQuestionTypesSettings;
									values.MULTIPLE = event.target.checked;
									update({ allowedQuestionTypesSettings: values });
								}}
							/>
						</ListGroupContainer>

						<ListGroupContainer>
							<Form.Switch
								className="list-group-item ps-5"
								label={i18n._("quiz-enable-question-shufflling")}
								checked={quiz.shuffleQuestions}
								disabled={disabledByMode}
								onChange={event => update({ shuffleQuestions: event.target.checked })}
							/>
						</ListGroupContainer>

						<Button
							variant="warning"
							className="mt-3"
							onClick={() => setArchiveModal(true)}
							disabled={quiz.state === "STARTED"}
						>
							<Trans id="archive-quiz-button" />
						</Button>
					</Form>
				);
			},
			() => null
		);
};

type ContainerWithHeaderBarProps = {
	label: string;
	shareButton?: {
		onClick: () => void;
		isDisabled?: boolean;
	};
	editButton?: {
		onClick: () => void;
		isDisabled?: boolean;
	};
} & PropsWithChildren;

const ContainerWithHeaderBar = (props: ContainerWithHeaderBarProps) => {
	const renderButtons = () => {
		return (
			<div>
				{props.editButton ? (
					<ButtonWithTooltip
						title={i18n._("quiz-data-tab.button-tooltip.edit")}
						variant="link"
						className="p-0"
						onClick={props.editButton.onClick}
						disabled={props.editButton.isDisabled}
					>
						<Pencil />
						<span className="ms-1">{i18n._("button-label-edit")}</span>
					</ButtonWithTooltip>
				) : null}

				{props.shareButton ? (
					<ButtonWithTooltip
						title={i18n._("quiz-data-tab.button-tooltip.share")}
						variant="link"
						className="p-0 ms-2"
						onClick={props.shareButton.onClick}
						disabled={props.shareButton.isDisabled}
					>
						<Share />
						<span className="ms-1">{i18n._("button-label-share")}</span>
					</ButtonWithTooltip>
				) : null}
			</div>
		);
	};

	return (
		<Form.Group className="mt-3">
			<div className="d-flex justify-content-between align-items-center">
				<Form.Text>{props.label}</Form.Text>
				{renderButtons()}
			</div>

			{props.children}
		</Form.Group>
	);
};
