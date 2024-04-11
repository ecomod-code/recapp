import { Fragment } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { Button } from "react-bootstrap";
import { BarChart } from "react-bootstrap-icons";
import { ChoiceElementStatistics } from "@recapp/models";

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

    return mbQuiz
        .flatMap(q =>
            !!q.quiz.uid
                ? maybe({
                      groups: q.quiz.groups,
                      questions: q.questions,
                      quizStats: q.quizStats,
                      questionStats: q.questionStats,
                  })
                : nothing()
        )
        .match(
            ({ groups, questions, quizStats, questionStats }) => {
                if (quizStats && groups) {
                    return groups.map((group, i) => {
                        return (
                            <Fragment key={i}>
                                <h2>{group.name}</h2>
                                {group.questions.map(qId => {
                                    const statIndex = quizStats.questionIds.findIndex(f => f === qId)!;
                                    const question = questions.find(q => q.uid === qId)!;
                                    const correct = quizStats.correctAnswers.at(statIndex) ?? 0;

                                    return (
                                        <div
                                            key={question.uid}
                                            className="m-1 p-2"
                                            style={{ backgroundColor: "lightgrey" }}
                                        >
                                            <div className="d-flex flex-row w-100">
                                                <div>
                                                    <div>{question.text.slice(0, 80)}</div>

                                                    <div>
                                                        <QuizBarChart
                                                            data={[correct]}
                                                            maxValue={quizStats.maximumParticipants}
                                                        />
                                                    </div>
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
                                                    >
                                                        Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
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
                            <h2>Frage: {question.text.slice(0, 80)}</h2>
                            <div>
                                {questionStats.participants} Teilnehmende von {questionStats.maximumParticipants} (
                                {((questionStats.participants / questionStats.maximumParticipants) * 100.0).toFixed(2)}{" "}
                                %) haben die Frage bearbeitet.
                            </div>
                            <div>
                                {question.type === "TEXT" && (
                                    <div className="mb-5">
                                        <div>
                                            {questionStats.answers.length -
                                                questionStats.answers.filter(a => a.toString().length > 0).length}{" "}
                                            Antworten wurden gegeben
                                        </div>
                                        <div className="mt-2 mb-2">Es wurden folgenden Antworten gegeben</div>
                                        {questionStats.answers.map((a, i) => (
                                            <div key={`${a}-${i}`}>{a}</div>
                                        ))}
                                    </div>
                                )}

                                {question.type !== "TEXT" && (
                                    <div className="mb-5">
                                        <div>
                                            {(questionStats as ChoiceElementStatistics).passed} von{" "}
                                            {(questionStats as ChoiceElementStatistics).participants} Antworten waren
                                            richtig.
                                        </div>
                                        <div className="mt-2 mb-2">Es wurden folgenden Antworten gegeben</div>
                                        {question.answers.map(({ text, correct }, i) => (
                                            <div key={text} className="d-flex flex-row w-100">
                                                <div className="w-50">
                                                    <span>Antwort:&nbsp;{text}&nbsp;</span>
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
                                Zurück zum Quiz
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
                                        Vorherige Frage
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
                                        Nächste Frage
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
