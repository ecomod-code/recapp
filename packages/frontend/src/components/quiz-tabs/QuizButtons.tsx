import { useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
// import { Quiz } from "@recapp/models";

import { useCurrentQuiz } from "../../hooks/state-actor/useCurrentQuiz";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { StopFill, Pencil, Play, QrCode, BoxArrowRight, Trash, Easel } from "react-bootstrap-icons";
import { CurrentQuizMessages } from "../../actors/CurrentQuizActor";
import { YesNoModal } from "../modals/YesNoModal";
import { ShareModal } from "../modals/ShareModal";
import { StatisticsExportModal } from "../modals/StatisticsExportModal";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { downloadFile } from "../../utils";
import { Id } from "@recapp/models";

type NewMode = "EDITING" | "STARTED" | "STOPPED" | "RESETSTATS";

export const QuizButtons = (props: {
	isUserInTeachersList: boolean;
	lastPreviewer: boolean;
	isQuizTeacher: boolean;
	userId: Id;
	disableForStudent: boolean;
	// quizState: Quiz["state"];
	uniqueLink: string;
	isQuizCreator: boolean;
	leaveQuiz: () => void;
	toggleStudentQuestions: () => void;
}) => {
	const [shareModal, setShareModal] = useState("");
	const { quizData, quizActorSend } = useCurrentQuiz();
	// const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz")
	const [leaveQuizModal, setLeaveQuizModal] = useState(false);
	const [showToEditModal, setShowToEditModal] = useState(false);
	const [showExportModal, setShowExportModal] = useState(false);

	const [quizModeChange, setQuizModeChange] = useState<{
		titleId: string;
		textId: string;
		newMode: NewMode;
	}>({ titleId: "", textId: "", newMode: "EDITING" });

	const resetQuizModeChange = () => {
		setQuizModeChange({ titleId: "", textId: "", newMode: "EDITING" });
	};

	const quizState = quizData?.quiz.state;

	const startQuizMode = () => {
		changeQuizMode("STARTED");

		// if (mbQuiz.flatMap(q => maybe(q.quiz?.state === "STOPPED")).orElse(false)) {
		// 	setQuizModeChange({
		// 		titleId: "title-set-quiz-mode-started",
		// 		textId: "info-set-quiz-mode-started",
		// 		newMode: "STARTED",
		// 	});
		// } else {
		// 	setQuizModeChange({
		// 		titleId: "title-set-quiz-mode-started",
		// 		textId: "warning-set-quiz-mode-started",
		// 		newMode: "STARTED",
		// 	});
		// }
	};

	const stopQuizMode = () => {
		if (quizState === "STARTED" || quizState === "EDITING") {
			changeQuizMode("STOPPED");
		} else {
			setQuizModeChange({
				titleId: "title-set-quiz-mode-stopped",
				textId: "info-set-quiz-mode-stopped",
				newMode: "STOPPED",
			});
		}
	};

	const editQuizMode = () => {
		if (quizState === "STARTED" || quizState === "STOPPED") {
			// changeQuizMode("EDITING");
			setShowToEditModal(true);
		} else {
			setQuizModeChange({
				titleId: "title-set-quiz-mode-edit",
				textId: "info-set-quiz-mode-edit",
				newMode: "EDITING",
			});
		}
	};

	const resetStats = () => {
		setQuizModeChange({
			titleId: "title-reset-quiz",
			textId: "info-reset-quiz",
			newMode: "RESETSTATS",
		});
	};

	const changeQuizMode = (newMode: "EDITING" | "STARTED" | "STOPPED" | "RESETSTATS") => {
		// tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ChangeState(quizModeChange.newMode)));
		// setQuizModeChange({ textId: "", titleId: "", newMode: "EDITING" });

		quizActorSend(CurrentQuizMessages.ChangeState(newMode));
		resetQuizModeChange();
		setShowToEditModal(false);
	};

	const handleClose = () => {
		setShowToEditModal(false);
		resetQuizModeChange();
	};

	const handleDownloadLinkClick = () => {
		handleClose();
		handleExportStatistics();
	};

	const handleExportStatistics = () => {
		setShowExportModal(true);
		quizActorSend(CurrentQuizMessages.ExportQuestionStats());
	};

	const cancelExport = () => {
		setShowExportModal(false);
		quizActorSend(CurrentQuizMessages.ExportDone());
	};

	const downloadExport = (filename: string) => {
		setShowExportModal(false);
		quizActorSend(CurrentQuizMessages.ExportDone());
		downloadFile(filename);
	};

	const togglePreviewMode = () => {
		const updatedPreviewers = props.isUserInTeachersList
			? [...(quizData?.quiz.previewers ?? []), props.userId]
			: (quizData?.quiz.previewers ?? []).filter(uid => uid !== props.userId);

		const startQuiz = props.isUserInTeachersList && quizState !== "STARTED";
		const stopQuiz = props.lastPreviewer && updatedPreviewers.length === 0 && quizState === "STARTED";

		alert(
			JSON.stringify(
				{ previewers: quizData?.quiz.previewers, updatedPreviewers, startQuiz, stopQuiz },
				undefined,
				2
			)
		);

		quizActorSend(CurrentQuizMessages.Update({ previewers: updatedPreviewers }));

		if (startQuiz) {
			setTimeout(() => {
				startQuizMode();
			}, 150);
		} else if (stopQuiz) {
			setTimeout(() => {
				stopQuizMode();
			}, 150);
		}
	};

	return (
		<>
			<ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />

			<StatisticsExportModal
				show={showExportModal}
				filename={quizData?.exportFile ?? ""}
				onClose={cancelExport}
				onDownload={downloadExport}
			/>

			<Modal show={showToEditModal} dialogClassName="modal-80w" contentClassName="overflow-hidden">
				<Modal.Title className="p-3 text-bg-primary">
					<div style={{ minWidth: "80vw" }}>
						<Trans id={"title-set-quiz-mode-edit"} />
					</div>
				</Modal.Title>
				<Modal.Body>
					<Trans
						id="info-set-quiz-mode-edit"
						components={{
							0: (
								<a
									className="link fw-bold"
									style={{ cursor: "pointer" }}
									onClick={handleDownloadLinkClick}
								/>
							),
						}}
					/>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="outline-primary" className="m-1" onClick={handleClose}>
						<Trans id="cancel" />
					</Button>
					<Button
						// ref={submitButtonRef}
						// onBlur={() => submitButtonRef.current?.focus()}
						className="m-1"
						autoFocus
						onClick={() => {
							changeQuizMode("EDITING");
							// setShowToEditModal(false);
						}}
					>
						<Trans id="okay" />
					</Button>
				</Modal.Footer>
			</Modal>

			<YesNoModal
				show={!!quizModeChange.textId}
				// onClose={() => setQuizModeChange({ textId: "", titleId: "", newMode: "EDITING" })}
				onClose={resetQuizModeChange}
				onSubmit={() => changeQuizMode(quizModeChange.newMode)}
				titleId={quizModeChange.titleId}
				textId={quizModeChange.textId}
			/>

			<YesNoModal
				show={leaveQuizModal}
				onClose={() => setLeaveQuizModal(false)}
				onSubmit={props.leaveQuiz}
				titleId={i18n._("leave-quiz-modal-title")}
				textId={i18n._("leave-quiz-modal-text")}
			/>
			<div className="d-flex gap-2 justify-content-end flex-column-reverse flex-lg-row">
				{!props.disableForStudent && (
					<Button
						variant="outline-primary"
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={() => setShareModal(props.uniqueLink)}
					>
						<QrCode className="mx-1" />
						<Trans id="quiz-show-qr-code-button" />
					</Button>
				)}

				{!props.disableForStudent && (
					<ButtonWithTooltip
						variant={
							// mbQuiz.flatMap(q => maybe(q.quiz.studentQuestions)).orElse(false)
							quizData?.quiz.studentQuestions ? "primary" : "outline-primary"
						}
						className="ps-2 pe-2 d-flex justify-content-center align-items-center"
						onClick={() => props.toggleStudentQuestions()}
						title={i18n._("quiz-toggle-student-questions-tooltip")}
					>
						<Trans id="quiz-toggle-student-questions" />
					</ButtonWithTooltip>
				)}

				{!props.disableForStudent && quizState !== "EDITING" && (
					<Button
						variant="success"
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={editQuizMode}
					>
						<Pencil className="mx-1" />
						<Trans id="edit-quiz-button" />
					</Button>
				)}

				{!props.disableForStudent && quizState !== "STOPPED" && (
					<Button
						variant="success"
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={stopQuizMode}
					>
						<StopFill size={24} />
						<Trans id="freeze-quiz-button" />
					</Button>
				)}

				{!props.disableForStudent && quizState !== "STARTED" && (
					<>
						<Button
							variant="success"
							className="d-flex justify-content-center align-items-center"
							onClick={startQuizMode}
						>
							<Play size={24} />
							<span className="d-flex flex-nowrap">
								<Trans id="start-quiz-mode-button" />
							</span>
						</Button>

						{quizState !== "EDITING" && (
							<Button
								variant="success"
								className="d-flex justify-content-center align-items-center"
								onClick={resetStats}
							>
								<Trash size={18} className="me-1" />
								<span className="d-flex flex-nowrap">
									<Trans id="reset-stats-button" />
								</span>
							</Button>
						)}
					</>
				)}

				{!props.isQuizCreator && (
					<Button
						variant="warning"
						className="col-12 col-lg-auto d-flex justify-content-center align-items-center"
						onClick={() => setLeaveQuizModal(true)}
					>
						<BoxArrowRight size={24} className="me-1" />
						<span className="d-flex flex-nowrap">
							<Trans id="leave-quiz-modal-title" />
						</span>
					</Button>
				)}
			</div>

			<div className="mt-2 d-flex justify-content-end flex-column flex-lg-row">
				{props.isQuizTeacher && (
					<Button
						variant={!props.isUserInTeachersList ? "primary" : "outline-primary"}
						className="d-flex justify-content-center align-items-center gap-1"
						onClick={togglePreviewMode}
					>
						<Easel size={20} />
						{/* <Trans id="quiz-show-qr-code-button" /> */}
						{!props.isUserInTeachersList
							? i18n._("quiz-button-label-end-preview")
							: i18n._("quiz-button-label-start-preview")}
					</Button>
				)}
			</div>
		</>
	);
};
