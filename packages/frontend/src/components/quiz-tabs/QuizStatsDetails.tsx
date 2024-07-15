import { KeyboardEvent, useEffect } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { BRAND } from "zod";
import { ChoiceElementStatistics } from "@recapp/models";
import Button from "react-bootstrap/Button";

import type { OwnAnswer } from "./QuizStatsTab";
import type { CurrentQuizState } from "../../actors/CurrentQuizActor";
import { QuestionBarChart } from "./quiz-bar/QuestionBarChart";
import { CORRECT_COLOR, WRONG_COLOR } from "../../constants/layout";

type QuizStatsDetailsProps = Pick<CurrentQuizState, "questionStats" | "questions"> & {
    groups: CurrentQuizState["quiz"]["groups"];
    ownAnswers: Record<string & BRAND<"UID">, OwnAnswer>;
    onBackToQuizClick: () => void;
    changeQuestionHandler: (index: string & BRAND<"UID">) => void;
};

export const QuizStatsDetails = ({
    questionStats,
    questions,
    groups,
    ownAnswers,
    onBackToQuizClick,
    changeQuestionHandler,
}: QuizStatsDetailsProps) => {
    if (!questionStats) return null;

    /* Question stats */
    const questionIndex = questions.findIndex(q => q.uid === questionStats.questionId)!;
    const question = questions[questionIndex];
    const questionsByGroup = groups?.map(g => g.questions).reduce((p, c) => [...p, ...c], []);
    const questionsByGroupIndex = questionsByGroup.findIndex(q => q === questionStats.questionId)!;

    const ownAnswer = ownAnswers[question.uid];

    const isPreviousButtonVisible = questionsByGroupIndex > 0;
    const isNextButtonVisible = questionsByGroupIndex < questionsByGroup.length - 1;

    const onPreviousClick = () => {
        if (!isPreviousButtonVisible) return;

        changeQuestionHandler(questionsByGroup[questionsByGroupIndex - 1]);
    };

    const onNextClick = () => {
        if (!isNextButtonVisible) return;

        changeQuestionHandler(questionsByGroup[questionsByGroupIndex + 1]);
    };

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
        <div>
            <p className="custom-line-clamp h2">
                <Trans id="question-stats-prefix" />
                {question.text}
            </p>
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
            <div>
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
                        {questionStats.answers.map((a, i) => (
                            <div key={`${a}-${i}`}>{a}</div>
                        ))}
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
                            {i18n._("question-stats-correct-answers", {
                                passed: (questionStats as ChoiceElementStatistics).passed,
                                participants: (questionStats as ChoiceElementStatistics).participants,
                            })}
                        </div>
                        <div className="mt-2 mb-2">
                            <Trans id="question-stats-given-answers" />
                        </div>
                        {question.answers.map(({ text, correct }, i) => (
                            <div key={text} className="d-flex flex-row w-100 mb-1">
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
                                            {ownAnswer[i] ? "\u2713" : null}
                                        </div>
                                    </div>
                                )}
                                <div className="w-50">
                                    <span>
                                        <Trans id="question-stats-answer-prefix" />
                                        {text}&nbsp;
                                    </span>
                                </div>
                                <div className="flex-grow-1">
                                    <QuestionBarChart
                                        data={questionStats.answers[i] as number}
                                        maxValue={questionStats.participants}
                                        color={correct ? CORRECT_COLOR : WRONG_COLOR}
                                        symbol={correct ? "\u2713" : "\u2717"}
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
