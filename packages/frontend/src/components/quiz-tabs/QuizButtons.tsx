import { useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe } from "tsmonads";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { Quiz } from "@recapp/models";

import Button from "react-bootstrap/Button";
import { StopFill, Pencil, Play, QrCode, BoxArrowRight, Trash } from "react-bootstrap-icons";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { YesNoModal } from "../modals/YesNoModal";
import { ShareModal } from "../modals/ShareModal";

export const QuizButtons = (props: {
	disableForStudent: boolean;
	quizState: Quiz["state"];
	uniqueLink: string;
	isQuizCreator: boolean;
	leaveQuiz: () => void;
}) => {
	const [shareModal, setShareModal] = useState("");
	const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const [leaveQuizModal, setLeaveQuizModal] = useState(false);

	const [quizModeChange, setQuizModeChange] = useState<{
		titleId: string;
		textId: string;
		newMode: "EDITING" | "STARTED" | "STOPPED" | "RESETSTATS";
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

	const resetStats = () => {
		setQuizModeChange({
			titleId: "title-reset-quiz",
			textId: "info-reset-quiz",
			newMode: "RESETSTATS",
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

				{!props.disableForStudent && props.quizState !== "EDITING" && (
					<Button
						variant="success"
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={editQuizMode}
					>
						<Pencil className="mx-1" />
						<Trans id="edit-quiz-button" />
					</Button>
				)}

				{!props.disableForStudent && props.quizState !== "STOPPED" && (
					<Button
						variant="success"
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={stopQuizMode}
					>
						<StopFill size={24} />
						<Trans id="freeze-quiz-button" />
					</Button>
				)}

				{!props.disableForStudent && props.quizState !== "STARTED" && (
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
		</>
	);
};
