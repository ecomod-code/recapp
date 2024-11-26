import { Fragment, useEffect, useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { i18n } from "@lingui/core";
import Button from "react-bootstrap/Button";
import { Id, isInStudentList, toId, User } from "@recapp/models";
// import axios from "axios";
import { StatisticsExportModal } from "../modals/StatisticsExportModal";
import { Trans } from "@lingui/react";
import { isNil, keys, range } from "rambda";
import { QuizStatsDetails } from "./QuizStatsDetails";
import { QuizBarChart } from "./quiz-bar/QuizBarChart";
import { PresentationModeSwitch } from "./PresentationModeSwitch";
// import { CHECK_SYMBOL, X_SYMBOL } from "../../constants/layout";
import { downloadFile } from "../../utils";
import { CORRECT_COLOR, WRONG_COLOR } from "../../colorPalette";

export type OwnAnswer = string | (boolean | null | undefined)[];

export const QuizStatsTab: React.FC<{ quizData: CurrentQuizState }> = ({ quizData }) => {
	const [mbQuiz, tryActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const [mbUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [showExportModal, setShowExportModal] = useState(false);
	const [ownAnswers, setOwnAnswers] = useState<Record<Id, OwnAnswer>>({});
	const [ownCorrectAnswers, setOwnCorrectAnswers] = useState<Record<Id, boolean>>({});
	const run = mbQuiz.flatMap(q => (q?.result && Object.keys(q.result).length > 0 ? maybe(q?.result) : nothing()));
	const counter = run.map(r => r.counter).orElse(0);

	// TODO Eigene Ergebnisse für das Quiz holen
	useEffect(() => {
		if (tryActor.succeeded) {
			mbUser
				.map(u => u.user.uid)
				.forEach(userId => {
					// const isStudent = mbQuiz.map(q => q.quiz.students.includes(uid)).orElse(false);
                    const quizData = mbQuiz
                        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
                        .match(
                            quizData => quizData,
                            () => null
                        );
					const isUserInStudentsList = quizData ? isInStudentList(quizData.quiz, userId) : true;
					console.log("STUD", isUserInStudentsList, run);
					if (isUserInStudentsList && run.hasValue) {
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
		downloadFile(filename);
		// axios
		// 	.get(`${import.meta.env.VITE_BACKEND_URI}/download/${filename}`, {
		// 		responseType: "blob",
		// 	})
		// 	.then(response => {
		// 		const url = window.URL.createObjectURL(response.data);
		// 		const a = document.createElement("a");
		// 		a.href = url;
		// 		a.download = filename;
		// 		a.click();
		// 	});
	};

	return mbQuiz
		.flatMap(q =>
			q.quiz.uid
				? maybe({
						groups: q.quiz.groups,
						questions: q.questions
							.filter(qu => qu.approved)
							.sort((a, b) => {
								const g = q.quiz.groups[0];
								if (!g) return 1;
								return (
									g.questions.findIndex(e => e === a.uid) - g.questions.findIndex(e => e === b.uid)
								);
							}),
						quizStats: q.quizStats,
						questionStats: q.questionStats,
						exportFile: q.exportFile,
						isPresentationModeActive: q.isPresentationModeActive,
					})
				: nothing()
		)
		.match(
			({ groups, questions, quizStats, questionStats, exportFile, isPresentationModeActive }) => {
				const zoom = isPresentationModeActive ? "175%" : undefined;

				if (quizStats && groups) {
					return groups.map((group, i) => {
						/* Quiz stats */
						return (
							<Fragment key={i}>
								<div className="mb-3 mt-3">
									{i18n._("quiz-card-number-of-questions", { count: quizData.questions.length })},{" "}
									{i18n._("quiz-card-number-of-participants", {
										count: quizData.quiz.students.length,
										max: quizStats?.maximumParticipants ?? 0,
									})}
								</div>

								<div className="mb-4 pb-2 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between">
									{/* this div is needed to make the buttons maintain the position right when the presentation-mode-switch is not visible */}
									<div>
										<PresentationModeSwitch />
									</div>

									{i == 0 && !isPresentationModeActive && (
										<>
											<StatisticsExportModal
												show={showExportModal}
												filename={exportFile}
												onClose={cancelExport}
												onDownload={downloadExport}
											/>
											<div className="d-flex flex-row">
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
								</div>
								<div key={i} style={{ zoom }}>
									{group.questions.map((qId, index, arr)=> {
										const isLast = arr.length - 1 === index;
										// This is the overview of all questions
										const statIndex = quizStats.questionIds.findIndex(f => f === qId)!;
										const question =
											statIndex > -1 ? questions.find(q => q.uid === qId)! : undefined;
										const questionId = question?.uid ?? toId("");
										const correct = statIndex > -1 ? quizStats.correctAnswers.at(statIndex) : 0;
										const wrong = statIndex > -1 ? quizStats.wrongAnswers.at(statIndex) : 0;
										const ownCorrect = (statIndex > -1 ? ownCorrectAnswers[qId] : false) ?? false;

										const noDetails = !question || quizStats.maximumParticipants === 0;

										return (
											<div
												key={questionId + index + qId}
												className="m-1xx p-2 pt-3 pb-3"
												// style={{ backgroundColor: "lightgrey" }}
												style={{ borderBottom: !isLast ?  "2px solid lightgray" : undefined }}
											>
												<div className="d-flex flex-column justify-content-between w-100 row-gap-1">
													<div className="d-flex align-items-start justify-content-between">
														<div
															className="text-overflow-ellipsis text-primary"
															style={{
																cursor: "pointer",
																textDecoration: "underline",
																textUnderlineOffset: "3px",
																// color: $primary
															}}
															onClick={() =>
																tryActor.forEach(actor =>
																	actor.send(
																		actor,
                                                                        CurrentQuizMessages.ActivateQuestionStats(
                                                                            questionId
                                                                        )
																	)
																)
															}
														>
															{question?.text ?? questions.find(q => q.uid === qId)?.text}
														</div>

														{/* <Button
															size="sm"
															className="p-0 ms-1"
															variant="link"
															onClick={() =>
																tryActor.forEach(actor =>
																	actor.send(
																		actor,
																		CurrentQuizMessages.ActivateQuestionStats(
																			// question?.uid ?? toId("")
																			questionId
																		)
																	)
																)
															}
															disabled={noDetails}
														>
															<Trans id="details" />
														</Button> */}
													</div>

													<div className="d-flex align-items-center justify-content-between flex-wrap row-gap-1">
														<div>
                                                            {!isNil(ownCorrectAnswers[qId]) && (
                                                                <>
                                                                    {/* (<Trans id="address-you" />:{" "} */}
                                                                    {/* {ownCorrect ? CHECK_SYMBOL : X_SYMBOL}) */}
                                                                    <span
                                                                        style={{
                                                                            color: ownCorrect
                                                                                ? CORRECT_COLOR
                                                                                : WRONG_COLOR,
                                                                            fontWeight: "bold",
                                                                            fontSize: 14,
                                                                        }}
                                                                    >
																		({ownCorrect ? (
                                                                            <Trans id="correct" />
                                                                        ) : (
                                                                            <Trans id="wrong" />
                                                                        )})
                                                                    </span>
                                                                    {/* ) */}
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
																	correct={correct ?? 0}
																	wrong={wrong ?? 0}
																	maxValue={quizStats.maximumParticipants}
																/>
															)}
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
							</Fragment>
						);
					});
				}
				if (questionStats) {
					// This is the overview of the details of a single question
					return (
						<>
							<PresentationModeSwitch />

							<QuizStatsDetails
								zoom={zoom}
								// groups={groups}
								questionStats={questionStats}
								questions={questions}
								ownAnswers={ownAnswers}
								onBackToQuizClick={() => {
									tryActor.forEach(actor =>
										actor.send(actor, CurrentQuizMessages.ActivateQuizStats())
									);
								}}
								changeQuestionHandler={index => {
									tryActor.forEach(actor =>
										actor.send(actor, CurrentQuizMessages.ActivateQuestionStats(index))
									);
								}}
							/>
						</>
					);
				}
			},
			() => null
		);
};
