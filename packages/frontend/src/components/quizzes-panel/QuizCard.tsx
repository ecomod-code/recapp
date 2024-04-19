import React from "react";
import { useNavigate } from "react-router-dom";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { fromTimestamp } from "itu-utils";
import { Quiz, QuestionGroup } from "@recapp/models";
import Card from "react-bootstrap/Card";
import { Pencil, Share, Trash } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { QuizStateBadge } from "../QuizStateBadge";

const getNumberOfQuestions = (groups: Array<QuestionGroup>): number =>
	groups.reduce((count, group) => count + (group?.questions?.length ?? 0), 0);

export const QuizCard: React.FC<{
	quiz: Partial<Quiz>;
	teachers: string[];
	onShare: () => void;
	onDelete?: () => void;
}> = ({ quiz, teachers, onShare, onDelete }) => {
	const nav = useNavigate();
	return (
		<div className="p-0 position-relative" style={{ margin: "2.5rem 0.5rem" }}>
			<div style={{ position: "absolute", top: -18, left: 2, fontSize: 12, color: "grey" }}>
				<Trans id="quiz-card-last-change" />
				&nbsp;
				{fromTimestamp(quiz.updated ?? -1).toLocaleString({ dateStyle: "medium", timeStyle: "medium" })}
			</div>
			<Card>
				<Card.Title className="text-start mx-2 mt-3">{quiz.title ?? ""}</Card.Title>
				<Card.Body>
					<div>
						{i18n._("quiz-card-number-of-participants", { count: quiz.students?.length ?? 0 })}&nbsp;
						{i18n._("quiz-card-number-of-questions", { count: getNumberOfQuestions(quiz.groups ?? []) })}
						&nbsp;
					</div>
					<div>
						<em>
							{i18n._("quiz-card-teachers-label")}: {teachers.join(", ")}
						</em>
					</div>
					<div className="d-flex flex-row">
						<QuizStateBadge state={quiz.state} />

						{!!quiz.archived && ( //
							<QuizStateBadge state="ARCHIVED" />
						)}
					</div>
				</Card.Body>

				<Card.Footer>
					<div className="d-flex flex-row justify-content-end">
						<ButtonWithTooltip
							title={i18n._("quiz-card.button-tooltip.edit")}
							variant="primary"
							onClick={() => nav({ pathname: "/Dashboard/quiz" }, { state: { quizId: quiz.uid } })}
						>
							<Pencil />
						</ButtonWithTooltip>

						<ButtonWithTooltip
							title={i18n._("quiz-card.button-tooltip.share")}
							className="ms-2"
							variant="secondary"
							onClick={onShare}
						>
							<Share />
						</ButtonWithTooltip>

						<ButtonWithTooltip
							title={i18n._("quiz-card.button-tooltip.delete")}
							variant="danger"
							className="ms-2"
							onClick={onDelete}
						>
							<Trash />
						</ButtonWithTooltip>
					</div>
				</Card.Footer>
			</Card>
		</div>
	);
};
