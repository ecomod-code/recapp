import { Fragment, useEffect, useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { Button } from "react-bootstrap";
import { ChoiceElementStatistics, Id, User } from "@recapp/models";
import axios from "axios";
import { QuizExportModal } from "../modals/QuizExportModal";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { isNil, range } from "rambda";
// import { LocalUserActor } from "../../actors/LocalUserActor";

const QuizBar = (props: { y: number; width: number; color: string }) => {
	return <rect y={props.y} height={24} width={props.width} fill={props.color} />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QuestionBarChart = (props: { data: number; maxValue: number; color: string; symbol: any }) => {
	const barWidth = 400; // Height of the chart area
	return (
		<svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
			<QuizBar y={0} width={barWidth} color={"lightgrey"} />
			<QuizBar y={0} width={(props.data / props.maxValue) * barWidth} color={props.color} />
			<text x="10" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
				{props.data}
			</text>
			<text x="190" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
				{(Math.round((props.data / props.maxValue) * 1000.0) / 10.0).toFixed(1)} %
			</text>
			<text x="370" y={19} z="10" style={{ fill: "white", fontSize: 20 }}>
				{props.symbol}
			</text>
		</svg>
	);
};

const CORRECT_COLOR = "#004488";
const WRONG_COLOR = "#DDAA33";

const QuizBarChart = (props: { data: number[]; maxValue: number }) => {
	const barWidth = 400; // Height of the chart area
	const hasMaxValue = props.maxValue > 0;

	return (
		<svg viewBox="0 0 400 24" fill="blue" width="100%" height="20">
			<>
				{props.data.map((value, index) => {
					return (
						<Fragment key={index}>
							<QuizBar y={index * 25} width={barWidth} color={hasMaxValue ? WRONG_COLOR : "grey"} />
							{hasMaxValue ? (
								<QuizBar
									y={index * 25}
									width={(value / props.maxValue) * barWidth}
									color={CORRECT_COLOR}
								/>
							) : null}
							<text x="10" y={index * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
								{"\u2713"} {value}
							</text>
							<text x="170" y={index * 25 + 19} z="10" style={{ fill: "white", fontSize: 20 }}>
								{hasMaxValue ? `${((value / props.maxValue) * 100.0).toFixed(1)}%` : ""}
							</text>
							<text
								x={370 - (props.maxValue - value).toString().length * 10}
								y={index * 25 + 19}
								z="10"
								style={{ fill: "white", fontSize: 20, textAlign: "right" }}
							>
								{props.maxValue - value} {"\u2717"}
							</text>
						</Fragment>
					);
				})}
			</>
		</svg>
	);
};

type OwnAnswer = string | (boolean | null | undefined)[];

export const QuizStatsTab: React.FC = () => {
	const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const [mbUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [showExportModal, setShowExportModal] = useState(false);
	const [ownAnswers, setOwnAnswers] = useState<Record<Id, OwnAnswer>>({});
	const [ownCorrectAnswers, setOwnCorrectAnswers] = useState<Record<Id, boolean>>({});
	const run = mbQuiz.flatMap(q => maybe(q.result));
	const counter = run.map(r => r.counter).orElse(0);

	// TODO Eigene Ergebnisse für das Quiz holen
	useEffect(() => {
		if (tryActor.succeeded) {
			mbUser
				.map(u => u.user.uid)
				.forEach(uid => {
					const isStudent = mbQuiz.map(q => q.quiz.students.includes(uid)).orElse(false);
					console.log("STUD", isStudent, run);
					if (isStudent && run.hasValue) {
						run.forEach(run => {
							range(0, run.questions?.length ?? 0).forEach(index => {
								setOwnAnswers(state => ({ ...state, [run.questions[index]]: run.answers[index] }));
								setOwnCorrectAnswers(state => ({
									...state,
									[run.questions[index]]: run.correct[index],
								}));
							});
						});
					}
				});
		}
	}, [tryActor.succeeded, counter]);

	const exportQuiz = () => {
		// TODO: Fragen ob csv oder pdf
		setShowExportModal(true);
		tryActor.forEach(actor => actor.send(actor, CurrentQuizMessages.ExportQuizStats()));
	};

	const exportQuestions = () => {
		// TODO: Fragen ob csv oder pdf
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
						/* Quiz stats */
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
									{group.questions.map(qId => {
										const statIndex = quizStats.questionIds.findIndex(f => f === qId)!;
										const question = questions.find(q => q.uid === qId)!;
										const correct = quizStats.correctAnswers.at(statIndex) ?? 0;
										const ownCorrect = ownCorrectAnswers[qId] ?? false;

										console.log("OWN", ownAnswers, ownCorrectAnswers);

										if (!question) return null;

										const noDetails = quizStats.maximumParticipants === 0;

										return (
											<div
												key={question.uid}
												className="m-1 p-2 pt-3"
												style={{ backgroundColor: "lightgrey" }}
											>
												<div className="d-flex flex-column justify-content-between w-100">
													<div className="d-flex align-items-start justify-content-between">
														<div className="text-overflow-ellipsis">
															{question.text ?? "---"}
														</div>

														<Button
															size="sm"
															className="p-0 ms-1"
															variant="link"
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

													<div className="d-flex align-items-center justify-content-between">
														<div>
															{!isNil(ownCorrectAnswers[qId]) && (
																<>
																	(<Trans id="address-you" />:{" "}
																	{ownCorrect ? "\u2713" : "\u2717"})
																</>
															)}
														</div>
														<div className="lh-1 ">
															{noDetails ? (
																<em>
																	<Trans id="no-data-yet" />
																</em>
															) : (
																<QuizBarChart
																	data={[correct]}
																	maxValue={quizStats.maximumParticipants}
																/>
															)}
														</div>
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
					/* Question stats */
					const questionIndex = questions.findIndex(q => q.uid === questionStats.questionId)!;
					const question = questions[questionIndex];
					const questionsByGroup = groups.map(g => g.questions).reduce((p, c) => [...p, ...c], []);
					const questionsByGroupIndex = questionsByGroup.findIndex(q => q === questionStats.questionId)!;

					const ownAnswer = ownAnswers[question.uid];

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
