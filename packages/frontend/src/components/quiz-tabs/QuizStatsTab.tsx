import { Fragment, useEffect, useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import Button from "react-bootstrap/Button";
import { Id, User } from "@recapp/models";
import axios from "axios";
import { StatisticsExportModal } from "../modals/StatisticsExportModal";
import { Trans } from "@lingui/react";
import { isNil, range } from "rambda";
import { QuizStatsDetails } from "./QuizStatsDetails";
import { QuizBarChart } from "./quiz-bar/QuizBarChart";
import { PresentationModeSwitch } from "./PresentationModeSwitch";
import { CHECK_SYMBOL, X_SYMBOL } from "../../constants/layout";

export type OwnAnswer = string | (boolean | null | undefined)[];

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
						questions: q.questions.filter(qu => qu.approved),
						quizStats: q.quizStats,
						questionStats: q.questionStats,
						exportFile: q.exportFile,
						isPresentationModeActive: q.isPresentationModeActive,
					})
				: nothing()
		)
		.match(
			({ groups, questions, quizStats, questionStats, exportFile, isPresentationModeActive }) => {
				if (quizStats && groups) {
					return groups.map((group, i) => {
						/* Quiz stats */
						return (
							<Fragment key={i}>
								<div className="mb-4 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between">
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
								</div>
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
																	{ownCorrect ? CHECK_SYMBOL : X_SYMBOL})
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
					return (
						<>
							<PresentationModeSwitch />

							<QuizStatsDetails
								groups={groups}
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
