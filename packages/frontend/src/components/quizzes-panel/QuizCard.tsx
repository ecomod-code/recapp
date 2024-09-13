import React from "react";
import { useNavigate } from "react-router-dom";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { fromTimestamp } from "itu-utils";
import { Quiz, QuestionGroup, toId } from "@recapp/models";
import Card from "react-bootstrap/Card";
import { Pencil, Share, Trash } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { QuizStateBadge } from "../QuizStateBadge";
import { useLocalUser } from "../../hooks/state-actor/useLocalUser";

const getNumberOfQuestions = (groups: Array<QuestionGroup>): number =>
	groups.reduce((count, group) => count + (group?.questions?.length ?? 0), 0);

export const QuizCard: React.FC<{
	quiz: Partial<Quiz>;
	teachers: string[];
	onShare: () => void;
	onDelete?: () => void;
}> = ({ quiz, teachers, onShare, onDelete }) => {
	const nav = useNavigate();
	const { localUser } = useLocalUser();

	const userId = localUser?.uid ?? toId("");
	const isQuizTeacher = quiz.teachers?.includes(userId);
	const isAdmin = localUser?.role === "ADMIN";
	const isAuthorized = isAdmin || isQuizTeacher;

	const isQuizStateStarted = quiz.state === "STARTED";
	const isStudentQuestionAllowed = !!quiz.studentQuestions;
	const isQuizEditable = !isQuizStateStarted && (isAuthorized || isStudentQuestionAllowed);

	const navigateToQuizPage = ()=> {
		nav({ pathname: "/Dashboard/quiz" }, { state: { quizId: quiz.uid } });
	};

	return (
		<div className="p-0 position-relative" style={{ margin: "2.5rem 0" }}>
			<div style={{ position: "absolute", top: -20, left: 2, fontSize: 14, color: "grey" }}>
				<Trans id="quiz-card-last-change" />
				&nbsp;
				{fromTimestamp(quiz.updated ?? -1).toLocaleString({ dateStyle: "medium", timeStyle: "medium" })}
			</div>
			<Card>
                <Card.Title className="text-start mx-2 mt-3 custom-line-clamp">
                    <p
                        className="m-0 d-inline text-primary "
                        style={{
                            cursor: "pointer",
                            textDecoration: "underline",
                            textUnderlineOffset: "3px",
                            // color: $primary

                        }}
                        onClick={navigateToQuizPage}
                        
                    >
                        {quiz.title ?? ""}
                    </p>
                </Card.Title>
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
                        {isQuizEditable ? (
                            <ButtonWithTooltip
                                title={i18n._("quiz-card.button-tooltip.edit")}
                                variant="primary"
                                onClick={navigateToQuizPage}
                            >
                                <Pencil />
                            </ButtonWithTooltip>
                        ) : null}

                        {isAuthorized ? (
                            <ButtonWithTooltip
                                title={i18n._("quiz-card.button-tooltip.share")}
                                className="ms-2"
                                variant="secondary"
                                onClick={onShare}
                            >
                                <Share />
                            </ButtonWithTooltip>
                        ) : null}

                        {isAuthorized ? (
                            <ButtonWithTooltip
                                title={i18n._("quiz-card.button-tooltip.delete")}
                                variant="danger"
                                className="ms-2"
                                onClick={onDelete}
                            >
                                <Trash />
                            </ButtonWithTooltip>
                        ) : null}
					</div>
				</Card.Footer>
			</Card>
		</div>
	);
};
