import { PropsWithChildren, useCallback, useState } from "react";
import { i18n } from "@lingui/core";
// import { useStatefulActor } from "ts-actors-react";
import { Quiz } from "@recapp/models";
// import { maybe, nothing } from "tsmonads";
import { toTimestamp } from "itu-utils";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import { Pencil, PersonPlus, ExclamationTriangle } from "react-bootstrap-icons";
// import { TextModal } from "../modals/TextModal";

import { CurrentQuizMessages } from "../../actors/CurrentQuizActor";
import { YesNoModal } from "../modals/YesNoModal";
import { ListGroupContainer } from "../ListGroupContainer";
import { Trans } from "@lingui/react";
import axios from "axios";
import { QuizExportModal } from "../modals/QuizExportModal";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { ShareQuizModal } from "../modals/ShareQuizModal";
import { checkIsCreatingQuestionDisabled, checkIsParticipationDisabled, debounce } from "../../utils";
import { CharacterTracker } from "../CharacterTracker";
import { DESCRIPTION_MAX_CHARACTERS, TITLE_MAX_CHARACTERS, TITLE_MIN_CHARACTERS } from "../../constants/constants";
import { useCurrentQuiz } from "../../hooks/state-actor/useCurrentQuiz";
// import { useCurrentQuiz } from "../../hooks/state-actor/useCurrentQuiz";
// import { keys } from "rambda";

interface Props {
	disableForStudent: boolean;
}

export const QuizDataTab: React.FC<Props> = props => {
	// const [textEdit, setTextEdit] = useState({ element: "", value: "", show: false, title: "" });
	const [shareModal, setShareModal] = useState(false);
	const [archiveModal, setArchiveModal] = useState(false);
	const [titleAndDescription, setTitleAndDescription] = useState({ title: "", description: "" });
	const [titleValidationError, setTitleValidationError] = useState("");

	// const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const { quizData, quizActorSend } = useCurrentQuiz();
	const [showExportModal, setShowExportModal] = useState(false);

	// const update = (q: Partial<Quiz>) => tryActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update(q)));
	const update = (q: Partial<Quiz>) => quizActorSend(CurrentQuizMessages.Update(q));

	const updateDebounced = useCallback(
		debounce((q: Partial<Quiz>) => update(q), 500),
		// [tryActor]
		[quizActorSend]
	);

	if (!quizData) return null;
	// if (!quizData.quiz) return null;

	const quiz = quizData.quiz;

	const closeShare = () => {
		setShareModal(false);
	};

	// const tNames = mbQuiz.map(s => s.teacherNames.join(", ")).orElse("");

	const startDuplication = () => {
		quizActorSend(CurrentQuizMessages.Duplicate());
	};

	const startExport = () => {
		setShowExportModal(true);
		// tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.Export()));
		quizActorSend(CurrentQuizMessages.Export());
	};

	const cancelExport = () => {
		setShowExportModal(false);
		// tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportDone()));
		quizActorSend(CurrentQuizMessages.ExportDone());
	};

	const downloadExport = (filename: string) => {
		setShowExportModal(false);
		// tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportDone()));
		quizActorSend(CurrentQuizMessages.ExportDone());

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

	const archive = () => {
		// tryActor.forEach(actor => {
		//     actor.send(actor, CurrentQuizMessages.Update({ uid: quiz.uid, state: "STOPPED", archived: toTimestamp() }));
		// });
		quizActorSend(CurrentQuizMessages.Update({ uid: quiz.uid, state: "STOPPED", archived: toTimestamp() }));
		setArchiveModal(false);
	};
	const disabledByMode = quiz.state !== "EDITING";
	// const fn = mbQuiz.flatMap(q => maybe(q.exportFile)).orUndefined();

	const isTitleAndDescriptionDisabled = props.disableForStudent || disabledByMode;

	const isCreatingQuestionDisabled = checkIsCreatingQuestionDisabled(quiz.allowedQuestionTypesSettings);
	const isParticipationDisabled = checkIsParticipationDisabled(quiz.studentParticipationSettings);

	return (
		<Form>
			{/* <QuizExportModal show={showExportModal} filename={fn} onClose={cancelExport} onDownload={downloadExport} /> */}
			{!props.disableForStudent ? (
				<>
					<QuizExportModal
						show={showExportModal}
						filename={quizData.exportFile}
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
				</>
			) : null}

			{/* <TextModal
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
                        /> */}

			<Form.Group className="mt-3">
				<div className="d-flex justify-content-between align-items-center">
					<div className="mb-0">
						<Form.Text>{i18n._("new-quiz-title")}</Form.Text>
						{!isTitleAndDescriptionDisabled ? (
							<CharacterTracker
								value={
									titleAndDescription.title || titleValidationError
										? titleAndDescription.title.length
										: quiz.title.length
								}
								maxValue={TITLE_MAX_CHARACTERS}
							/>
						) : null}
					</div>
					{titleValidationError ? (
						<Form.Text className="text-danger text-overflow-ellipsis" style={{ maxWidth: "60%" }}>
							{i18n._("quiz-data-tab.edit-title-message.last-saved-value")}: <b>{quiz.title}</b>
						</Form.Text>
					) : (
						<SyncStatus localValue={titleAndDescription.title} storedValue={quiz.title} />
					)}
				</div>
				<Form.Control
					disabled={isTitleAndDescriptionDisabled}
					type="text"
					// value={quiz.title}
					value={titleAndDescription.title || titleValidationError ? titleAndDescription.title : quiz.title}
					onChange={e => {
						const value = e.target.value;
						const isTextTooLong = value.length >= TITLE_MAX_CHARACTERS;
						const text = isTextTooLong ? value?.slice(0, TITLE_MAX_CHARACTERS) : value;

						setTitleAndDescription(prev => ({ ...prev, title: text }));

						if (text.length >= TITLE_MIN_CHARACTERS) {
							updateDebounced({ title: text });
							setTitleValidationError("");
						} else {
							const tooShortMessage = i18n._("error-quiz-title-too-short");
							setTitleValidationError(tooShortMessage);
						}
					}}
					isInvalid={!!titleValidationError}
				/>
				<Form.Control.Feedback type="invalid">{titleValidationError}</Form.Control.Feedback>
			</Form.Group>

			<Form.Group className="mt-3">
				<div className="d-flex justify-content-between align-items-center">
					<div className="mb-0">
						<Form.Text>{i18n._("quiz-description")}</Form.Text>
						{!isTitleAndDescriptionDisabled ? (
							<CharacterTracker
								value={
									titleAndDescription.description
										? titleAndDescription.description.length
										: quiz.description.length
								}
								maxValue={DESCRIPTION_MAX_CHARACTERS}
							/>
						) : null}
					</div>
					<SyncStatus localValue={titleAndDescription.description} storedValue={quiz.description} />
				</div>

				<Form.Control
					disabled={isTitleAndDescriptionDisabled}
					type="textarea"
					as="textarea"
					rows={5}
					// value={quiz.description}
					value={titleAndDescription.description ? titleAndDescription.description : quiz.description}
					onChange={e => {
						const value = e.target.value;
						const isTextTooLong = value.length >= DESCRIPTION_MAX_CHARACTERS;
						const text = isTextTooLong ? value?.slice(0, DESCRIPTION_MAX_CHARACTERS) : value;

						// update({ description: text });
						setTitleAndDescription(prev => ({ ...prev, description: text }));
						updateDebounced({ description: text });
					}}
				/>
			</Form.Group>

			{!props.disableForStudent ? (
				<>
					<ContainerWithHeaderBar label={i18n._("number-of-participants")}>
						<Form.Control type="text" value={quizData.quiz.students?.length ?? 0} disabled />
					</ContainerWithHeaderBar>
					<ContainerWithHeaderBar
						label={i18n._("teachers")}
						shareButton={{
							onClick: () => setShareModal(true),
							isDisabled: disabledByMode,
						}}
					>
						{/* <Form.Control type="text" value={tNames} disabled /> */}
						<Form.Control type="text" value={quizData.teacherNames} disabled />
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
						<Form.Switch
							className="list-group-item ps-5"
							label={i18n._("quiz-allows-student-to-see-statistics")}
							checked={quiz.studentsCanSeeStatistics}
							disabled={disabledByMode}
							onChange={event => update({ studentsCanSeeStatistics: event.target.checked })}
						/>
						<Form.Switch
							className="list-group-item ps-5"
							label={i18n._("quiz-hide-comments-switch")}
							checked={quiz.hideComments}
							onChange={event => update({ hideComments: event.target.checked })}
							disabled={disabledByMode}
						/>
					</ListGroupContainer>

					<ListGroupContainer header={i18n._("quiz-student-participation")}>
						{isParticipationDisabled ? (
							<Alert variant="warning" className="d-flex align-items-start">
								<div className="d-flex">
									<ExclamationTriangle size={20} />
								</div>

								<span className="ms-1">
									{i18n._("quiz-data-tab.alert-message.participation-is-disabled")}
								</span>
							</Alert>
						) : null}

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
						{isCreatingQuestionDisabled ? (
							<Alert variant="warning" className="d-flex align-items-start">
								<div className="d-flex">
									<ExclamationTriangle size={20} />
								</div>

								<span className="ms-1">
									{i18n._("quiz-data-tab.alert-message.create-new-question-is-disabled")}
								</span>
							</Alert>
						) : null}

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
							label={i18n._("quiz-enable-shuffling-question")}
							checked={quiz.shuffleQuestions}
							disabled={disabledByMode}
							onChange={event => update({ shuffleQuestions: event.target.checked })}
						/>
					</ListGroupContainer>
					<ListGroupContainer>
						<Form.Switch
							className="list-group-item ps-5"
							label={i18n._("quiz-enable-shuffling-answers")}
							checked={quiz.shuffleAnswers}
							disabled={disabledByMode}
							onChange={event => update({ shuffleAnswers: event.target.checked })}
						/>
					</ListGroupContainer>
					<div className="mt-3 d-flex flex-column flex-lg-row justify-content-end gap-2">
						<Button variant="secondary" onClick={startDuplication} disabled={quiz.state === "STARTED"}>
							<Trans id="duplicate-quiz-button" />
						</Button>
						<Button variant="secondary" onClick={startExport} disabled={quiz.state === "STARTED"}>
							<Trans id="export-quiz-button" />
						</Button>
						<Button
							variant="warning"
							onClick={() => setArchiveModal(true)}
							disabled={quiz.state === "STARTED"}
						>
							<Trans id="archive-quiz-button" />
						</Button>
					</div>
				</>
			) : null}
		</Form>
	);

	// return mbQuiz
	//     .flatMap(q => (q.quiz.uid ? maybe(q.quiz) : nothing()))
	//     .match(
	//         quiz => {

	//         },
	//         () => null
	//     );
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
						className="p-0 ms-2 d-flex justify-content-center align-items-center"
						onClick={props.shareButton.onClick}
						disabled={props.shareButton.isDisabled}
					>
						<PersonPlus size={20} />
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

const SyncStatus = (props: { localValue: string; storedValue: string }) => {
	const isVisible = !!props.localValue;
	if (!isVisible) {
		return null;
	}

	const isSynced = props.localValue === props.storedValue;

	return (
		<Form.Text className={`fw-bold ${isSynced ? "text-success" : "text-danger"}`}>
			{isSynced
				? i18n._("quiz-data-tab.sync-status.is-saved")
				: i18n._("quiz-data-tab.sync-status.currently-saving")}
		</Form.Text>
	);
};
