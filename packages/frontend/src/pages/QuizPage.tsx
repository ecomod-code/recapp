import { Fragment, useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { useActorSystem, useStatefulActor } from "ts-actors-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, toId, Comment, Id, QuestionGroup, UserParticipation, isInTeachersList } from "@recapp/models";
import { Maybe, maybe, nothing } from "tsmonads";
import { keys } from "rambda";

import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { CommentCard } from "../components/cards/CommentCard";
import { QuizDataTab } from "../components/quiz-tabs/QuizDataTab";
import { QuestionsTab } from "../components/quiz-tabs/QuestionsTab";
import { RunningQuizTab } from "../components/quiz-tabs/RunningQuizTab";
import { QuizStatsTab } from "../components/quiz-tabs/QuizStatsTab";
import { QuizButtons } from "../components/quiz-tabs/QuizButtons";
import { CommentsContainer } from "../components/cards/CommentsContainer";

import { actorUris } from "../actorUris";
import { CurrentQuizMessages, CurrentQuizState } from "../actors/CurrentQuizActor";
import { toTimestamp, debug } from "itu-utils";
import { Trans } from "@lingui/react";
import { CommentEditorModal, CommentEditorModalOnSubmitParams } from "../components/modals/CommentEditorModal";
import { QuizStateBadge } from "../components/QuizStateBadge";
// import { useCurrentQuiz } from "../hooks/state-actor/useCurrentQuiz";

const sortComments = (a: Comment, b: Comment) => {
	if (a.answered && !b.answered) return 1;
	if (!a.answered && b.answered) return -1;
	if (a.upvoters.length !== b.upvoters.length) return b.upvoters.length - a.upvoters.length;
	return b.updated.value - a.updated.value;
};

type TabValue = "quizData" | "questions" | "statistics";

const tabRecords: Record<TabValue, { label: string; value: TabValue }> = {
	quizData: {
		label: "quiz-tab-label-data",
		value: "quizData",
	},
	questions: {
		label: "quiz-tab-label-questions",
		value: "questions",
	},
	statistics: {
		label: "quiz-tab-label-statistics",
		value: "statistics",
	},
};

const DEFAULT_ACTIVE_KEY: TabValue = "questions";

export const QuizPage: React.FC = () => {
	const nav = useNavigate();
	// const {quizData, quizActorSend} = useCurrentQuiz();
	const [showMDModal, setShowMDModal] = useState(false);
	const { state } = useLocation();
	const quizId: Id = state?.quizId;
	const activate = state?.activate;
	const start: boolean = state?.start ?? false;
	const system = useActorSystem();
	const [mbLocalUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const [activeKey, setActiveKey] = useState<TabValue>(DEFAULT_ACTIVE_KEY);
	const [showError, setShowError] = useState<string>("");

	const deleted = mbQuiz.map(m => m.deleted).orElse(false);
	useEffect(() => {
		if (deleted) setShowError("quiz-error-quiz-deleted");
	}, [deleted]);

	const onErrorClose = () => {
		setShowError("");
		nav({ pathname: "/Dashboard" });
	};

	useEffect(() => {
		if (!quizId) {
			return;
		}
		if (activate) {
			// mbLocalUser.forEach(lu => {
			//     quizActorSend(CurrentQuizMessages.Activate({ userId: lu.user.uid, quizId }));
			//     quizActorSend(CurrentQuizMessages.SetQuiz(toId(quizId)));
			// });
			tryQuizActor.forEach(q => {
				mbLocalUser.forEach(lu => {
					q.send(q, CurrentQuizMessages.Activate({ userId: lu.user.uid, quizId }));
					q.send(q, CurrentQuizMessages.SetQuiz(toId(quizId)));
				});
			});
		}

		// mbLocalUser.forEach(lu => {
		// 	quizActorSend(CurrentQuizMessages.SetUser(lu.user));
		// 	quizActorSend(CurrentQuizMessages.SetQuiz(toId(quizId)));
		// });
		tryQuizActor.forEach(q => {
			mbLocalUser.forEach(lu => {
				q.send(q, CurrentQuizMessages.SetUser(lu.user));
				q.send(q, CurrentQuizMessages.SetQuiz(toId(quizId)));
				if (start) {
					setTimeout(() => q.send(q, CurrentQuizMessages.ChangeState("STARTED")), 500);
				}
			});
		});
	}, [quizId, tryQuizActor.hasValue]);

	const localUser: Maybe<User> = mbLocalUser.flatMap(u => (keys(u.user).length > 0 ? maybe(u.user) : nothing()));
	const userId: Id = localUser.map(l => l.uid).orElse(toId(""));

    const quizData = mbQuiz
        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
        .match(
            quizData => quizData,
            () => null
        );

    const isUserInTeachersList = quizData ? isInTeachersList(quizData?.quiz, userId) : false;

	const teachers: string[] = mbQuiz.flatMap(q => maybe(q.quiz?.teachers)).orElse([]);
	const comments: Comment[] = mbQuiz.map(q => q.comments).orElse([]);

	// const showStatTab2 =
	//     (quizData && quizData.quizStats && (quizData.quizStats.maximumParticipants ?? 0) > 0) ||
	//     !!quizData?.questionStats;

	const showStatTab =
		mbQuiz.map(q => (q.quizStats?.maximumParticipants ?? 0) > 0).orElse(false) ||
		mbQuiz.map(q => !!q.questionStats).orElse(false);

	// const isQuizStateEditing2 = quizData?.quiz?.state && quizData.quiz.state === "EDITING";
	const isQuizStateEditing = mbQuiz.flatMap(q => maybe(q.quiz?.state)).orElse("STOPPED") === "EDITING";

	useEffect(() => {
		if (activeKey === "statistics" && !showStatTab && isQuizStateEditing) {
			setActiveKey(DEFAULT_ACTIVE_KEY);

			// quizActorSend(CurrentQuizMessages.setIsPresentationModeActive(false));
			tryQuizActor.forEach(actor => actor.send(actor, CurrentQuizMessages.setIsPresentationModeActive(false)));
		}
	}, [showStatTab, isQuizStateEditing]);

	const upvoteComment = (commentId: Id) => {
		// quizActorSend(CurrentQuizMessages.UpvoteComment(commentId));
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.UpvoteComment(commentId));
		});
	};

	const finishComment = (commentId: Id) => {
		const user: Id = localUser.map(l => l.uid).orElse(toId(""));
		if (!teachers.includes(user)) {
			return;
		}

		// quizActorSend(CurrentQuizMessages.FinishComment(commentId));
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.FinishComment(commentId));
		});
	};

	const deleteComment = (commentId: Id) => {
		// quizActorSend(CurrentQuizMessages.DeleteComment(commentId));
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.DeleteComment(commentId));
		});
	};

	const jumpToQuestion = (questionId: Id) => {
		const groups: QuestionGroup[] = mbQuiz.flatMap(q => maybe(q.quiz?.groups)).orElse([]);
		const groupName = groups.find(g => g.questions.includes(questionId))?.name;
		if (groupName) {
			const writeAccess =
				isQuizStateEditing &&
				(teachers.includes(localUser.map(u => u.uid).orElse(toId(""))) ||
					mbQuiz
						.flatMap(q => maybe(q.questions))
						.map(
							qs =>
								!!qs.find(
									q =>
										q.uid === questionId &&
										q.authorId === localUser.map(u => u.uid).orElse(toId(""))
								)
						)
						.orElse(false));
			nav(
				{ pathname: "/Dashboard/Question" },
				{ state: { quizId: questionId, group: groupName, write: writeAccess ? "true" : undefined } }
			);
		}
	};

	const leaveQuiz = () => {
		// quizActorSend(CurrentQuizMessages.LeaveQuiz());
		tryQuizActor.forEach(actor => actor.send(actor, CurrentQuizMessages.LeaveQuiz()));
		nav({ pathname: "/Dashboard" });
	};

	if (!quizId) {
		return (
			<div className="flex-1 justify-content-center align-items-center">
				<h1>
					<Trans id="quiz-not-found-error-message" />
				</h1>
				<Link to={{ pathname: "/Dashboard" }}>
					<Trans id="back-to-dashboard-link" />
				</Link>
			</div>
		);
	}

	if (showError) {
		return (
			<Modal show={!!showError} contentClassName="overflow-hidden">
				<Modal.Title className="py-2 px-3 bg-warning">{i18n._("quiz-error-quiz-title")}</Modal.Title>
				<Modal.Body>
					<Trans id={showError} />
				</Modal.Body>
				<Modal.Footer className="p-0">
					<Button onClick={onErrorClose}>{i18n._("okay")}</Button>
				</Modal.Footer>
			</Modal>
		);
	}

	return mbQuiz
		.flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
		.match(
			quizData => {
				const allowed = (user: User) => {
					if (user.role === "STUDENT") {
						return true;
					}
					if (user.role === "TEACHER" && !quizData.quiz.teachers.includes(user.uid)) {
						return true;
					}
					return false;
				};

				const run = quizData.run;
				const qData = quizData.questions;
				const questions = run?.questions.map(id => qData.find(q => q.uid === id)) ?? [];
				const currentQuestion = questions[run?.counter ?? 0];
				const questionId = currentQuestion?.uid ?? toId("");

				const disableForStudent = localUser.map(allowed).orElse(true);
				const isQuizTeacher =
					teachers.includes(localUser.map(u => u.uid).orElse(toId(""))) ||
					localUser.map(u => u.role).is(r => r === "ADMIN");
				const userName = localUser.map(u => u.username).orElse("---");
				const userNickname = localUser.flatMap(u => maybe(u.nickname)).orUndefined();
				const studentsCanSeeStatistics = quizData.quiz.studentsCanSeeStatistics;

				// const userRole = localUser.map(u => u.role).orElse("STUDENT");
				const isQuizCompleted = (quizData.run?.counter ?? 0) >= (quizData.run?.questions.length ?? 0);

                const isQuizStateStarted = quizData.quiz.state === "STARTED";
                const isStudentCommentsAllowed = quizData.quiz.studentComments;
                const showCommentSection = isQuizTeacher || (isQuizStateStarted && isStudentCommentsAllowed);

				const showCommentArea = !quizData.quiz.hideComments || (isQuizTeacher && isQuizStateEditing);

				const isCommentSectionVisible = quizData.isCommentSectionVisible;

				const addComment = ({ text, name }: CommentEditorModalOnSubmitParams) => {
					mbLocalUser.forEach(() => {
						const c: Omit<Comment, "authorId" | "uid"> = {
							authorName: name ?? userName,
							text: text,
							created: toTimestamp(),
							updated: toTimestamp(),
							upvoters: [],
							answered: false,
							relatedQuiz: quizData.quiz.uid,
                            ...(!isQuizTeacher ? { relatedQuestion: questionId } : {}),
						};
						// quizActorSend(CurrentQuizMessages.AddComment(c));
						tryQuizActor.forEach(q => q.send(q, CurrentQuizMessages.AddComment(c)));
					});
					setShowMDModal(false);
				};

				const logQuestion = (questionId: Id, answer: string | boolean[]) => {
					console.log("SYS", system, "URI", actorUris["CurrentQuiz"]);
					// todo: what is the correct way to use useCurrentQuiz
					tryQuizActor.forEach(actor =>
						actor.send(actorUris["CurrentQuiz"], CurrentQuizMessages.LogAnswer({ questionId, answer }))
					);
				};


				const setIsCommentSectionVisible = (value: boolean) => {
					// quizActorSend(CurrentQuizMessages.setIsCommentSectionVisible(value));
					tryQuizActor.forEach(actor =>
						actor.send(actor, CurrentQuizMessages.setIsCommentSectionVisible(value))
					);
				};

				return (
					<Container fluid>
						<CommentEditorModal
							titleId="new-comment-title"
							editorValue=""
							show={showMDModal}
							onClose={() => setShowMDModal(false)}
							onSubmit={addComment}
							// isStudent={!isQuizTeacher}
							isQuizTeacher={isQuizTeacher}
							userNames={[userName, userNickname ?? ""]}
							participationOptions={keys(quizData.quiz.studentParticipationSettings)
								.filter(k => !!quizData.quiz.studentParticipationSettings[k as UserParticipation])
								.map(k => k as UserParticipation)}
						/>

						{!quizData.isPresentationModeActive ? (
							<Row>
								<div className="mb-3 d-flex flex-column flex-lg-row justify-content-between">
									<Breadcrumb>
										<Breadcrumb.Item onClick={() => nav({ pathname: "/Dashboard" })}>
											Dashboard
										</Breadcrumb.Item>
										<Breadcrumb.Item
											active
											className="text-overflow-ellipsis"
											style={{ maxWidth: 400 }}
										>
											{mbQuiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}
										</Breadcrumb.Item>
									</Breadcrumb>

									{!disableForStudent || quizData.quiz.state !== "STARTED" ? (
										<span className="mb-3 text-end">
											<Trans id="quiz-page.quiz-state.label" />:{" "}
											<QuizStateBadge state={quizData.quiz.state} />
										</span>
									) : null}
								</div>
							</Row>
						) : null}

                        {showCommentSection ? (
                            <Row>
                                <CommentsContainer
									isQuizTeacher={isQuizTeacher}
                                    onClickAddComment={() => setShowMDModal(true)}
                                    onClickToggleButton={() => setIsCommentSectionVisible(!isCommentSectionVisible)}
                                    isCommentSectionVisible={isCommentSectionVisible}
                                    showCommentArea={showCommentArea}
                                >
                                    {mbQuiz
                                        .flatMap(q => (keys(debug(q.quiz)).length > 0 ? maybe(q.quiz) : nothing()))
                                        .map(
                                            q =>
                                                (q.comments ?? [])
                                                    .map(c => debug(comments.find(cmt => {
														if(isQuizTeacher){
															return cmt.uid === c;
														}

														return cmt.uid === c && cmt.relatedQuestion === questionId;
													})!))
                                                    .filter(Boolean) as Comment[]
                                        )
                                        .map(c =>
                                            c.sort(sortComments).map(cmt => (
                                                <div key={cmt.uid} style={{ width: "20rem", maxWidth: "95%" }}>
                                                    <CommentCard
                                                        isCommentSectionVisible={isCommentSectionVisible}
                                                        teachers={teachers}
                                                        userId={localUser.map(l => l.uid).orElse(toId(""))}
                                                        comment={cmt}
                                                        onUpvote={() => upvoteComment(cmt.uid)}
                                                        onAccept={() => finishComment(cmt.uid)}
                                                        onDelete={() => deleteComment(cmt.uid)}
                                                        onJumpToQuestion={() => jumpToQuestion(cmt.relatedQuestion!)}
                                                        questionText={
                                                            cmt.relatedQuestion
                                                                ? mbQuiz
                                                                      .flatMap(q =>
                                                                          maybe(
                                                                              q.questions.find(
                                                                                  q => q.uid === cmt.relatedQuestion
                                                                              )?.text
                                                                          )
                                                                      )
                                                                      .orElse("")
                                                                      .substring(0, 20)
                                                                : undefined
                                                        }
                                                    />
                                                </div>
                                            ))
                                        )
                                        .orElse([<Fragment key="key-1" />])}
                                </CommentsContainer>
                            </Row>
                        ) : null}


						{!quizData.isPresentationModeActive ? (
							<Row>
								<div className="my-4">
									<QuizButtons
										isUserInTeachersList={isUserInTeachersList}
										userId={userId}
										disableForStudent={disableForStudent}
										// quizState={quizData.quiz.state}
										uniqueLink={quizData.quiz.uniqueLink}
										leaveQuiz={leaveQuiz}
										isQuizCreator={
											teachers[0] ===
											mbLocalUser.flatMap(u => maybe(u.user?.uid)).orElse(toId(""))
										}
										toggleStudentQuestions={() =>
											tryQuizActor.map(actor =>
												actor.send(
													actor,
													CurrentQuizMessages.Update({
														studentQuestions: !mbQuiz
															.flatMap(q => maybe(q.quiz.studentQuestions))
															.orElse(false),
													})
												)
											)
										}
									/>
								</div>
							</Row>
						) : null}

						<Row className="mt-5">
							<Tabs
								// defaultActiveKey="questions"
								className="mb-3 w-100"
								activeKey={activeKey}
								onSelect={k => setActiveKey(k as TabValue)}
							>
								{/* {!disableForStudent && ( */}
								<Tab
									eventKey={tabRecords.quizData.value}
									title={i18n._(tabRecords.quizData.label)}
									tabClassName={quizData.isPresentationModeActive ? "d-none" : ""}
								>
									{/* <QuizDataTab /> */}
									<QuizDataTab disableForStudent={disableForStudent} />
								</Tab>
								{/* )} */}
								<Tab
									eventKey={tabRecords.questions.value}
									title={i18n._(tabRecords.questions.label)}
									tabClassName={quizData.isPresentationModeActive ? "d-none" : ""}
								>
									{disableForStudent && quizData.quiz.state === "STARTED" ? (
										<RunningQuizTab 
											isQuizTeacher={isQuizTeacher}
											onClickAddComment={() => setShowMDModal(true)}
											quizState={quizData} 
											logQuestion={logQuestion} 
										/>
									) : (
										<QuestionsTab
											quizData={quizData}
											localUser={localUser}
											disableForStudent={disableForStudent}
										/>
									)}
								</Tab>
								{/* {showStatTab && (isQuizTeacher ? true : isQuizCompleted ) && ( */}
								{showStatTab &&
									(isQuizTeacher ? true : isQuizCompleted && studentsCanSeeStatistics) && (
										<Tab
											eventKey={tabRecords.statistics.value}
											title={i18n._(tabRecords.statistics.label)}
											tabClassName={quizData.isPresentationModeActive ? "d-none" : ""}
										>
											<QuizStatsTab  quizData={quizData} />
										</Tab>
									)}
							</Tabs>
						</Row>
					</Container>
				);
			},
			() => null
		);
};
