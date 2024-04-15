import { Fragment, useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { Button } from "react-bootstrap";
import { ChoiceElementStatistics } from "@recapp/models";
import axios from "axios";
import { QuizExportModal } from "../modals/QuizExportModal";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";

const QuizBar = (props: { y: number; width: number; color: string }) => {
    return <rect y={props.y} height={24} width={props.width} fill={props.color} />;
};

const QuestionBarChart = (props: { data: number; maxValue: number; color: string }) => {
    const barWidth = 400; // Height of the chart area
    return (
        <svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
            <QuizBar y={0} width={barWidth} color={"lightgrey"} />
            <QuizBar y={0} width={(props.data / props.maxValue) * barWidth} color={props.color} />
            <text x="10" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
                {props.data}
            </text>
            <text x="190" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
                {(props.data / props.maxValue) * 100.0} %
            </text>
        </svg>
    );
};

const QuizBarChart = (props: { data: number[]; maxValue: number }) => {
    const barWidth = 400; // Height of the chart area
    const hasMaxValue = props.maxValue > 0;

    return (
        <svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
            <>
                {props.data.map((value, index) => {
                    return (
                        <Fragment key={index}>
                            <QuizBar y={index * 25} width={barWidth} color={hasMaxValue ? "red" : "grey"} />
                            {hasMaxValue ? (
                                <QuizBar y={index * 25} width={(value / props.maxValue) * barWidth} color={"green"} />
                            ) : null}
                            <text x="10" y={index * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
                                {value}
                            </text>
                            <text x="170" y={index * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
                                {hasMaxValue ? `${(value / props.maxValue) * 100.0}%` : ""}
                            </text>
                            <text
                                x="380"
                                y={index * 25 + 19}
                                z="10"
                                style={{ fill: "white", fontSize: 20, textAlign: "right" }}
                            >
                                {props.maxValue - value}
                            </text>
                        </Fragment>
                    );
                })}
            </>
        </svg>
    );
};

export const QuizStatsTab: React.FC = () => {
    const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
    const [showExportModal, setShowExportModal] = useState(false);

    const exportQuiz = () => {
        setShowExportModal(true);
        tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportQuizStats()));
    };

    const exportQuestions = () => {
        setShowExportModal(true);
        tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportQuestionStats()));
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

    return mbQuiz
        .flatMap(q =>
            q.quiz.uid
                ? maybe({
                      groups: q.quiz.groups,
                      questions: q.questions,
                      quizStats: q.quizStats,
                      questionStats: q.questionStats,
                      exportFile: q.exportFile,
                  })
                : nothing()
        )
        .match(
            ({ groups, questions, quizStats, questionStats, exportFile }) => {
                if (quizStats && groups) {
                    return groups.map((group, i) => {
                        return (
                            <Fragment key={i}>
                                {i == 0 && (
                                    <>
                                        <QuizExportModal
                                            show={showExportModal}
                                            filename={exportFile}
                                            onClose={cancelExport}
                                            onDownload={downloadExport}
                                        />
                                        <div className="mb-4 d-flex flex-row">
                                            <Button onClick={exportQuiz}>
                                                <Trans id="export-quiz-statistics-button" />
                                            </Button>
                                            &nbsp;&nbsp;
                                            <Button onClick={exportQuestions}>
                                                <Trans id="export-question-statistics-button" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                                <Fragment key={i}>
                                    <h2>{group.name}</h2>
                                    {group.questions.map(qId => {
                                        const statIndex = quizStats.questionIds.findIndex(f => f === qId)!;
                                        const question = questions.find(q => q.uid === qId)!;
                                        const correct = quizStats.correctAnswers.at(statIndex) ?? 0;

                                        if (!question) return null;

                                        const noDetails = quizStats.maximumParticipants === 0;

                                        return (
                                            <div
                                                key={question.uid}
                                                className="m-1 p-2"
                                                style={{ backgroundColor: "lightgrey" }}
                                            >
                                                <div className="d-flex flex-row w-100">
                                                    <div>
                                                        <div>{question.text?.slice(0, 80) ?? "---"}</div>

                                                        {noDetails ? (
                                                            <div>
                                                                <em>
                                                                    <Trans id="no-data-yet" />
                                                                </em>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <QuizBarChart
                                                                    data={[correct]}
                                                                    maxValue={quizStats.maximumParticipants}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-grow-1"></div>
                                                    <div className="align-self-center">
                                                        <Button
                                                            variant="primary"
                                                            onClick={() =>
                                                                tryActor.forEach(actor =>
                                                                    actor.send(
                                                                        actor,
                                                                        CurrentQuizMessages.ActivateQuestionStats(
                                                                            question.uid
                                                                        )
                                                                    )
                                                                )
                                                            }
                                                            disabled={noDetails}
                                                        >
                                                            <Trans id="details" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </Fragment>
                            </Fragment>
                        );
                    });
                }
                if (questionStats) {
                    const questionIndex = questions.findIndex(q => q.uid === questionStats.questionId)!;
                    const question = questions[questionIndex];
                    const questionsByGroup = groups.map(g => g.questions).reduce((p, c) => [...p, ...c], []);
                    const questionsByGroupIndex = questionsByGroup.findIndex(q => q === questionStats.questionId)!;

                    return (
                        <div>
                            <h2>
                                <Trans id="question-stats-prefix" /> {question.text.slice(0, 80)}
                            </h2>
                            <div>
                                {i18n._("question-stats-info", {
                                    participants: questionStats.participants,
                                    maxParticipants: questionStats.maximumParticipants,
                                    ratio: (
                                        (questionStats.participants / questionStats.maximumParticipants) *
                                        100.0
                                    ).toFixed(2),
                                })}
                            </div>
                            <div>
                                {question.type === "TEXT" && (
                                    <div className="mb-5">
                                        <div>
                                            {i18n._("question-stats-answers-given", {
                                                numberOfAnswers:
                                                    questionStats.answers.length -
                                                    questionStats.answers.filter(a => a.toString().length > 0).length,
                                            })}
                                        </div>
                                        <div className="mt-2 mb-2">
                                            <Trans id="question-stats-given-answers" />
                                        </div>
                                        {questionStats.answers.map((a, i) => (
                                            <div key={`${a}-${i}`}>{a}</div>
                                        ))}
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
                                            <div key={text} className="d-flex flex-row w-100">
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
                                                        color={correct ? "green" : "red"}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="primary"
                                onClick={() =>
                                    tryActor.forEach(actor =>
                                        actor.send(actor, CurrentQuizMessages.ActivateQuizStats())
                                    )
                                }
                            >
                                <Trans id="question-stats-back-to-quiz-button" />
                            </Button>
                            &nbsp;&nbsp;
                            {questionsByGroupIndex > 0 && (
                                <>
                                    <Button
                                        variant="primary"
                                        onClick={() =>
                                            tryActor.forEach(actor =>
                                                actor.send(
                                                    actor,
                                                    CurrentQuizMessages.ActivateQuestionStats(
                                                        questionsByGroup[questionsByGroupIndex - 1]
                                                    )
                                                )
                                            )
                                        }
                                    >
                                        <Trans id="question-stats-previous-question-button" />
                                    </Button>
                                    &nbsp;&nbsp;
                                </>
                            )}
                            {questionsByGroupIndex < questionsByGroup.length - 1 && (
                                <>
                                    <Button
                                        variant="primary"
                                        onClick={() =>
                                            tryActor.forEach(actor =>
                                                actor.send(
                                                    actor,
                                                    CurrentQuizMessages.ActivateQuestionStats(
                                                        questionsByGroup[questionsByGroupIndex + 1]
                                                    )
                                                )
                                            )
                                        }
                                    >
                                        <Trans id="question-stats-next-question-button" />
                                    </Button>
                                    &nbsp;&nbsp;
                                </>
                            )}
                        </div>
                    );
                }
            },
            () => null
        );
};
