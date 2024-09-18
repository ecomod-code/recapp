import { KeyboardEvent, useEffect } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { BRAND } from "zod";
import { ChoiceElementStatistics } from "@recapp/models";
import Button from "react-bootstrap/Button";

import { useRendered } from "../../hooks/useRendered";
import type { OwnAnswer } from "./QuizStatsTab";
import type { CurrentQuizState } from "../../actors/CurrentQuizActor";
import { QuestionBarChart } from "./quiz-bar/QuestionBarChart";
import { CORRECT_COLOR, WRONG_COLOR } from "../../colorPalette";
import { CHECK_SYMBOL, X_SYMBOL } from "../../constants/layout";

type QuizStatsDetailsProps = Pick<CurrentQuizState, "questionStats" | "questions"> & {
	// groups: CurrentQuizState["quiz"]["groups"];
	ownAnswers: Record<string & BRAND<"UID">, OwnAnswer>;
	onBackToQuizClick: () => void;
	changeQuestionHandler: (index: string & BRAND<"UID">) => void;
	zoom: string | undefined;
};

export const QuizStatsDetails = ({
	questionStats,
	questions,
	// groups,
	ownAnswers,
	zoom,
	onBackToQuizClick,
	changeQuestionHandler,
}: QuizStatsDetailsProps) => {
	if (!questionStats) return null;

	/* Question stats */
	const questionIndex = questions.findIndex(q => q.uid === questionStats.questionId)!;
	const question = questions[questionIndex];

	const questionsList = questions.map(q => q.uid); // .reverse();

	const ownAnswer = ownAnswers[question.uid];

	const isNextButtonVisible = questionIndex < questionsList.length - 1;
	const isPreviousButtonVisible = questionIndex > 0; //  questionsList.length + 1;

	const onPreviousClick = () => {
		if (!isPreviousButtonVisible) return;
		console.log(
			"QUESTIONS",
			questions,
			"current",
			questionsList[questionIndex],
			"next",
			questionsList[questionIndex - 1]
		);
		changeQuestionHandler(questionsList[questionIndex - 1]);
	};

	const onNextClick = () => {
		if (!isNextButtonVisible) return;

		console.log(
			"QUESTIONS",
			questions,
			"current",
			questionsList[questionIndex],
			"next",
			questionsList[questionIndex + 1]
		);
		changeQuestionHandler(questionsList[questionIndex + 1]);
	};

	const { rendered } = useRendered({ value: question.text });

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const keydownHandler = (e: any) => {
			const code = (e as KeyboardEvent).code;

			if (code === "ArrowLeft") {
				onPreviousClick();
			}
			if (code === "ArrowRight") {
				onNextClick();
			}
		};

		window.addEventListener("keydown", keydownHandler);

		return () => {
			window.removeEventListener("keydown", keydownHandler);
		};
	}, []);

	return (
		<div className="mt-4">
			{/* <p className="custom-line-clamp h2"> */}
			{/* {question.text} */}
			<p className="h2">
				<Trans id="question-stats-prefix" />
			</p>
			<div className="p-3 mb-4 bg-light border border-1" style={{ zoom }}>
				<div dangerouslySetInnerHTML={{ __html: rendered }} />
			</div>
			{/*<div>
								{i18n._("question-stats-info", {
									participants: questionStats.participants,
									maxParticipants: questionStats.maximumParticipants,
									ratio: (
										(questionStats.participants / questionStats.maximumParticipants) *
										100.0
									).toFixed(2),
								})}
							</div>*/}
			<div style={{ zoom }}>
				{question.type === "TEXT" && (
					<div className="mb-5">
						<div>
							{i18n._("question-stats-answers-given", {
								numberOfAnswers:
									questionStats.answers.length -
									questionStats.answers.filter(a => a.toString().length === 0).length,
							})}
						</div>
						<div className="mt-2 mb-2">
							<Trans id="question-stats-given-answers" />:
						</div>
                        {questionStats.answers.length > 0 ? (
                            <div className="p-2 bg-light border border-1">
                                {questionStats.answers.map((a, i) => (
                                    <div key={`${a}-${i}`}>{a}</div>
                                ))}
                            </div>
                        ) : null}
						{ownAnswer && (
							<>
								<div className="mt-2 mb-2">
									<em>
										<Trans id="question-stats-your-answer" />:
									</em>
								</div>
								<div>
									<em>{ownAnswer}</em>
								</div>
							</>
						)}
					</div>
				)}

				{question.type !== "TEXT" && (
					<div className="mb-5">
						<div>
							<p
								dangerouslySetInnerHTML={{
									__html: i18n._("question-stats-sum-answers", {
										sum:
											(questionStats as ChoiceElementStatistics).participants -
											(questionStats as ChoiceElementStatistics).passed -
											(questionStats as ChoiceElementStatistics).wrong,
										participants: (questionStats as ChoiceElementStatistics).participants,
									}),
								}}
							/>
							<p
								dangerouslySetInnerHTML={{
									__html: i18n._("question-stats-correct-answers", {
										passed: (questionStats as ChoiceElementStatistics).passed,
										participants: (questionStats as ChoiceElementStatistics).participants,
									}),
								}}
							/>
							<p
								dangerouslySetInnerHTML={{
									__html: i18n._("question-stats-wrong-answers", {
										wrong: (questionStats as ChoiceElementStatistics).wrong,
										participants: (questionStats as ChoiceElementStatistics).participants,
									}),
								}}
							/>
						</div>
						<div className="mt-2 mb-2">
							<Trans id="question-stats-given-answers" />
						</div>
						{question.answers.map(({ text, correct }, i) => (
							<div key={text} className="mb-1 p-1 d-flex justify-content-end align-items-center flex-wrap bg-light border border-1">
								<div className="d-flex flex-row flex-fill">
									{ownAnswer && (
										<div
											className="me-1 d-flex justify-content-center align-items-center"
											style={{
												backgroundColor: "lightgray",
												fontWeight: "bold",
												padding: 2,
											}}
										>
											<Trans id="address-you" />:{" "}
											<div
												className="ms-1 d-flex justify-content-center align-items-center"
												style={{ border: "1px solid gray", width: 18, height: 18 }}
											>
												{ownAnswer[i] ? CHECK_SYMBOL : null}
											</div>
										</div>
									)}
									<div className="flex-fill">
										<span className="d-flex flex-wrap">
											<Trans id="question-stats-answer-prefix" />&nbsp;
											<span>{text}&nbsp;</span>
										</span>
									</div>
								</div>

								<div className="flex-grow-1xx d-flex justify-content-end">
									<QuestionBarChart
										data={questionStats.answers[i] as number}
										maxValue={questionStats.participants}
										color={correct ? CORRECT_COLOR : WRONG_COLOR}
										symbol={correct ? CHECK_SYMBOL : X_SYMBOL}
									/>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
			<Button variant="primary" onClick={onBackToQuizClick}>
				<Trans id="question-stats-back-to-quiz-button" />
			</Button>
			&nbsp;&nbsp;
			{/* {questionsByGroupIndex > 0 && ( */}
			{isPreviousButtonVisible && (
				<>
					<Button as="button" variant="primary" onClick={onPreviousClick}>
						<Trans id="question-stats-previous-question-button" />
					</Button>
					&nbsp;&nbsp;
				</>
			)}
			{/* {questionsByGroupIndex < questionsByGroup.length - 1 && ( */}
			{isNextButtonVisible && (
				<>
					<Button variant="primary" onClick={onNextClick}>
						<Trans id="question-stats-next-question-button" />
					</Button>
					&nbsp;&nbsp;
				</>
			)}
		</div>
	);
};
