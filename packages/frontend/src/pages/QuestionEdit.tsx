import { Fragment, useEffect, useState } from "react";
// import React, { useState } from 'react';

import "katex/dist/katex.css";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { i18n } from "@lingui/core";
import { useLocation, useNavigate } from "react-router-dom";
import { maybe, nothing } from "tsmonads";
import { Trans } from "@lingui/react";
import { keys } from "rambda";
import "katex/dist/katex.css";
import { useStatefulActor } from "ts-actors-react";
import { User, toId, Comment, Question, Id, QuestionType, UserParticipation, Quiz } from "@recapp/models";

import { useRendered } from "../hooks/useRendered";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
// import { DashLg, Pencil, Plus } from "react-bootstrap-icons";
import { ArrowDown, ArrowDownUp, ArrowUp, DashLg } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../components/ButtonWithTooltip";
import { CommentCard } from "../components/cards/CommentCard";
// import { MarkdownModal } from "../components/modals/MarkdownModal";
import { TextModal } from "../components/modals/TextModal";
import { CommentsContainer } from "../components/cards/CommentsContainer";
import { CurrentQuizMessages, CurrentQuizState } from "../actors/CurrentQuizActor";
import { toTimestamp, debug } from "itu-utils";
import { CommentEditorModal, CommentEditorModalOnSubmitParams } from "../components/modals/CommentEditorModal";
import { getStoredParticipationValue } from "../components/layout/UserParticipationSelect";

const MAX_ANSWER_COUNT_ALLOWED = 20;

const sortComments = (a: Comment, b: Comment) => {
	if (a.answered && !b.answered) return -1;
	if (!a.answered && b.answered) return 1;
	if (a.upvoters.length !== b.upvoters.length) return b.upvoters.length - a.upvoters.length;
	return b.updated.value - a.updated.value;
};

export const QuestionEdit: React.FC = () => {
	const { state } = useLocation();
	const questionId = state?.quizId ?? "";
	const [currentQuestionId, setCurrentQuestionId] = useState(questionId);
	const formerGroup = state?.group ?? "";
	const writeAccess = state?.write === "true" ?? false;
	// const [mbQuiz, tryQuizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[]; questions: Question[] }>(
	const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz", {
		quiz: {} as Quiz,
		comments: [],
		questions: [],
		teacherNames: [],
		questionStats: undefined,
		groupStats: undefined,
		isCommentSectionVisible: false,
		quizStats: undefined,
		run: undefined,
		exportFile: undefined,
		deleted: false,
		isPresentationModeActive: false,
	});
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const q = mbQuiz.map(q => q.quiz).orUndefined();
	const isQuizStateStarted = q?.state === "STARTED";
	const isQuizStateEditing = q?.state === "EDITING";

	const [mbUser] = useStatefulActor<{ user: User }>("LocalUser");

	const [showError, setShowError] = useState<string>("");

	const deleted = mbQuiz.flatMap(m => maybe(m.deleted)).orElse(false);
	useEffect(() => {
		if (deleted) setShowError("quiz-error-quiz-deleted");
	}, [deleted]);

	const [question, setQuestion] = useState<Omit<Question, "uid" | "created" | "updated" | "authorID"> & { uid?: Id }>(
		{
			text: "",
			type: "TEXT",
			authorId: toId(""),
			answers: [],
			approved: false,
			editMode: true,
			quiz: toId(""),
			answerOrderFixed: false,
		}
	);
	const [hint, setHint] = useState(false);
	// const [groups, setGroups] = useState<string[]>([]);
	const [selectedGroup, setSelectedGroup] = useState("");
	const [allowedQuestionTypes, setAllowedQuestionTypes] = useState<string[]>([]);
	const [allowedAuthorTypes, setAllowedAuthorTypes] = useState<UserParticipation[]>([]);
	const [authorType, setAuthorType] = useState<UserParticipation>("ANONYMOUS");
	const nav = useNavigate();
	const students = mbQuiz.flatMap(q => maybe(q.quiz)).flatMap(q => maybe(q.students));
	const isStudent = mbUser.map(u => students.map(s => s.includes(u.user.uid)).orElse(false)).orElse(false);

	const teachers = mbQuiz.flatMap(q => maybe(q.quiz)).flatMap(q => maybe(q.teachers));
	const isQuizTeacher = mbUser.map(u => teachers.map(s => s.includes(u.user.uid)).orElse(false)).orElse(false);
	const isStudentCommentsAllowed = q?.studentComments;
	const showCommentSection = isQuizTeacher || (isQuizStateStarted && isStudentCommentsAllowed);

	const quiz = mbQuiz.orUndefined();
	const questionsIds = quiz?.quiz.groups?.[0].questions ?? [];
	const currentQuestionIndex = questionsIds.findIndex(x => x === currentQuestionId);
	const isLastQuestion = currentQuestionIndex >= questionsIds.length - 1;

	const userName = mbUser.flatMap(u => maybe(u.user.username)).orElse("---");
	const userNickname = mbUser.flatMap(u => maybe(u.user.nickname)).orUndefined();

	useEffect(() => {
		try {
			if (mbQuiz.isEmpty()) {
				return;
			}
		} catch {
			return;
		}
		const quiz = mbQuiz.orUndefined();

		const groups = quiz?.quiz?.groups?.map(g => g.name);
		if (groups) {
			const aat: UserParticipation[] = keys(quiz?.quiz.studentParticipationSettings)
				.filter(k => !!quiz?.quiz.studentParticipationSettings[k as UserParticipation])
				.map(k => k as UserParticipation);
			setAllowedAuthorTypes(aat);

			const aqt: QuestionType[] = keys(quiz?.quiz.allowedQuestionTypesSettings)
				.filter(k => !!quiz?.quiz.allowedQuestionTypesSettings[k as QuestionType])
				.map(k => k as QuestionType);
			setAllowedQuestionTypes(aqt);

			// if (questionId) {
			if (currentQuestionId) {
				// const editQuestion: Partial<Question> = quiz?.questions?.find(q => q.uid === questionId) ?? {};
				const editQuestion: Partial<Question> = quiz?.questions?.find(q => q.uid === currentQuestionId) ?? {};
				const newType: QuestionType = aqt.includes(editQuestion.type ?? question.type)
					? editQuestion.type ?? question.type
					: aqt[0];

				const authorName = editQuestion.authorName;
				if (authorName === userName) {
					setAuthorType("NAME");
				} else if (authorName === userNickname) {
					setAuthorType("NICKNAME");
				} else {
					setAuthorType("ANONYMOUS");
				}

				setQuestion({ ...question, ...editQuestion, type: newType });
				setHint(!!editQuestion.hint);
				if (writeAccess) {
					tryQuizActor.forEach(actor =>
						actor.send(
							actor,
							CurrentQuizMessages.UpdateQuestion({
								// question: { uid: questionId, editMode: true },
								question: { uid: currentQuestionId, editMode: true },
								group: "", // formerGroup,
							})
						)
					);
				}
			} else {
				const storedValue = getStoredParticipationValue();
				// if (storedValue && (isQuizTeacher || aat.includes(storedValue))) {
				if (storedValue && aat.includes(storedValue)) {
					setAuthorType(storedValue);
				} else {
					if (!aat.includes("ANONYMOUS")) {
						if (!aat.includes("NICKNAME")) {
							setAuthorType("NAME");
						} else {
							setAuthorType("NICKNAME");
						}
					}
				}

				const newType: QuestionType = aqt.includes(question.type) ? question.type : aqt[0];

				setQuestion({ ...question, quiz: quiz?.quiz?.uid ?? toId(""), type: newType });
			}
			if (formerGroup) {
				setSelectedGroup(formerGroup);
			} else {
				setSelectedGroup(groups[0]);
			}
			// setGroups(groups);
		}
	}, [mbQuiz.hasValue, q, currentQuestionId]);

	const { rendered } = useRendered({ value: question.text });
	const [showMDModal, setShowMDModal] = useState({ type: "", titleId: "" });
	const [showTextModal, setShowTextModal] = useState({ property: "", titleId: "", editorText: "" });

	const handleClose = () => {
		setShowMDModal({ type: "", titleId: "" });
		setShowTextModal({ property: "", titleId: "", editorText: "" });
	};

	const handleMDShow = (type: string, titleId: string) => {
		setShowTextModal({ property: "", titleId: "", editorText: "" });
		setShowMDModal({ type, titleId });
	};

	console.log({ answerCount: question.answers });

	const addAnswer = () => {
		const answers = question.answers;
		answers.push({ correct: false, text: "" });
		setQuestion(state => ({ ...state, answers }));
		// editAnswer(answers.length - 1);
	};

	const deleteAnswer = (index: number) => {
		const answers = question.answers.filter((_, i) => i !== index);
		setQuestion(state => ({ ...state, answers }));
	};

	const toggleAnswer = (index: number) => {
		const answers = question.answers;
		answers[index].correct = !answers[index].correct;
		if (question.type === "SINGLE" && answers[index].correct) {
			answers.forEach((_, i) => {
				if (i !== index) {
					answers[i].correct = false;
				}
			});
		}
		setQuestion(state => ({ ...state, answers }));
	};

	const moveAnswer = (answerIndex: number, upwards: boolean) => {
		const newOrder: Question["answers"] = [];
		const changeIndex = upwards ? answerIndex - 1 : answerIndex + 1;

		question.answers.forEach((answer, index) => {
			if (index === answerIndex) {
				return;
			}
			if (index === changeIndex) {
				if (upwards) {
					newOrder.push(question.answers[answerIndex]);
					newOrder.push(answer);
				} else {
					newOrder.push(answer);
					newOrder.push(question.answers[answerIndex]);
				}
			} else {
				newOrder.push(answer);
			}
		});

		setQuestion(prev => ({ ...prev, answers: newOrder }));
	};

	// const editAnswer = (index: number) => {
	//     setShowTextModal({
	//         titleId: "edit-answer-text",
	//         property: `answer-${index}`,
	//         editorText: question.answers[index].text,
	//     });
	// };

	const resetQuestionEditModeFlag = () => {
		if (writeAccess) {
			tryQuizActor.forEach(actor =>
				actor.send(
					actor.name,
					CurrentQuizMessages.UpdateQuestion({
						question: { uid: toId(currentQuestionId), editMode: false },
						group: selectedGroup !== formerGroup ? selectedGroup : "",
					})
				)
			);
		}
	};

	const onCancelClick = () => {
		resetQuestionEditModeFlag();
		nav(-1);
	};

	const handleSaveAndGoToNextQuestion = () => {
		if (isLastQuestion) return;

		setCurrentQuestionId(questionsIds[currentQuestionIndex + 1]);
		submitAndNavigateBack(false);
	};

	const submitAndNavigateBack = async (navigateBack: boolean) => {
		if (writeAccess) {
			const quizQuestion = { ...question };
			if (quizQuestion.type === "TEXT") {
				quizQuestion.answers = [];
			}
			const user = mbUser.map(u => u.user);
			user.match(
				userData => {
					if (isStudent) {
						quizQuestion.authorId = userData.uid;
						switch (authorType) {
							case "ANONYMOUS":
								quizQuestion.authorName = i18n._("anonymous");
								break;
							case "NICKNAME":
								quizQuestion.authorName = userData.nickname ?? userData.username;
								break;
							case "NAME":
								quizQuestion.authorName = userData.username;
								break;
						}
					} else {
						quizQuestion.authorName = userData.username;
					}
				},
				() => {}
			);

			tryQuizActor.forEach(actor => {
				if (currentQuestionId) {
					actor.send(
						actor.name,
						CurrentQuizMessages.UpdateQuestion({
							question: { ...quizQuestion, uid: toId(currentQuestionId) },
							group: selectedGroup !== formerGroup ? selectedGroup : "",
						})
					);
				} else {
					actor.send(
						actor.name,
						CurrentQuizMessages.AddQuestion({ question: quizQuestion, group: selectedGroup })
					);
				}
			});
		}

		if (navigateBack) {
			nav(
				{ pathname: "/Dashboard/quiz" },
				{
					state: {
						quizId: mbQuiz.flatMap(q => maybe(q.quiz?.uid)).orElse(toId("")),
					},
				}
			);
		}
	};

	const upvoteComment = (commentId: Id) => {
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.UpvoteComment(commentId));
		});
	};

	const finishComment = (commentId: Id) => {
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.FinishComment(commentId));
		});
	};

	const addComment = ({ text, name, isRelatedToQuestion }: CommentEditorModalOnSubmitParams) => {
		const c: Omit<Comment, "authorId" | "uid"> = {
			text: text,
			authorName: name ?? userName,
			created: toTimestamp(),
			updated: toTimestamp(),
			upvoters: [],
			answered: false,
			relatedQuiz: question.quiz,
			relatedQuestion: isRelatedToQuestion ? question.uid : undefined,
		};
		tryQuizActor.forEach(q => q.send(q, CurrentQuizMessages.AddComment(c)));
		handleClose();
	};

	const deleteComment = (commentId: Id) => {
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.DeleteComment(commentId));
		});
	};

	const shuffleAnswers = mbQuiz.flatMap(q => maybe(q.quiz.shuffleAnswers)).orElse(false);

	const comments: Comment[] = mbQuiz.flatMap(q => maybe(q.comments)).orElse([]);

	const showCommentArea =
		!mbQuiz.flatMap(q => maybe(q.quiz.hideComments)).orElse(false) ||
		(!isStudent && mbQuiz.flatMap(q => maybe(q.quiz.state)).orElse("EDITING") === "EDITING");

	const isCommentSectionVisible = mbQuiz
		.flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
		.match(
			x => x.isCommentSectionVisible,
			() => false
		);

	const setIsCommentSectionVisible = (value: boolean) => {
		tryQuizActor.forEach(actor => actor.send(actor, CurrentQuizMessages.setIsCommentSectionVisible(value)));
	};

	const isQuestionAdded = question.text.trim();
	const isAnswersAdded = question.answers?.some(q => !!q.text.trim());
	const isAllAnswersContainText = question.answers?.every(q => !!q.text.trim());
	const isCorrectAnswerAssigned = question.answers.some(answer => answer.correct);

	let saveButtonDisableReason = "";
	if (!isQuestionAdded) {
		saveButtonDisableReason = i18n._("question-edit-page.save-button-disabled-reason.missing-question");
	} else {
		if (question.type !== "TEXT") {
			if (!isAnswersAdded) {
				saveButtonDisableReason = i18n._("question-edit-page.save-button-disabled-reason.missing-answers");
			} else if (!isCorrectAnswerAssigned) {
				saveButtonDisableReason = i18n._(
					"question-edit-page.save-button-disabled-reason.did-not-assign-correct-answer"
				);
			} else if (!isAllAnswersContainText) {
				saveButtonDisableReason = i18n._(
					"question-edit-page.save-button-disabled-reason.empty-answers-not-allowed"
				);
			}
		}
	}

	const isSaveButtonDisabled = !!saveButtonDisableReason;
	// const isActivateReorderAnswersVisible = isQuizTeacher && isQuizStateEditing && !shuffleAnswers;
	const isActivateReorderAnswersVisible = writeAccess && isQuizStateEditing && !shuffleAnswers;

	const onErrorClose = () => {
		setShowError("");
		nav({ pathname: "/Dashboard" });
	};

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

	return (
		<>
			<TextModal
				titleId={showTextModal.titleId}
				show={!!showTextModal.titleId}
				editorValue={showTextModal.editorText}
				onClose={handleClose}
				onSubmit={text => {
					if (showTextModal.property.startsWith("answer-")) {
						const index = parseInt(showTextModal.property.replace("answer-", ""));
						const answers = question.answers;
						answers[index].text = text;
						setQuestion(state => ({ ...state, answers }));
					} else {
						setQuestion(state => {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(state as any)[showTextModal.property] = text;
							return { ...state };
						});
					}
					handleClose();
				}}
			/>
			{/* <MarkdownModal
                titleId={showMDModal.titleId}
                editorValue={showMDModal.type === "QUESTION" ? question.text : ""}
                show={!!showMDModal.titleId && showMDModal.type === "QUESTION"}
                onClose={handleClose}
                onSubmit={text => {
                    setQuestion(state => ({ ...state, text }));
                    handleClose();
                }}
            /> */}
			<CommentEditorModal
				titleId={showMDModal.titleId}
				editorValue={showMDModal.type === "QUESTION" ? question.text : ""}
				show={!!showMDModal.titleId && showMDModal.type !== "QUESTION"}
				onClose={handleClose}
				showRelatedQuestionCheck
				// isStudent={isStudent}
				isQuizTeacher={isQuizTeacher}
				userNames={[userName, userNickname ?? ""]}
				participationOptions={allowedAuthorTypes}
				onSubmit={({ text, name, isRelatedToQuestion }) => {
					addComment({ text, name, isRelatedToQuestion });
					handleClose();
				}}
			/>

			<div>
				<div
					className="d-flex flew-row flex-nowrap align-items-center mb-2"
					style={{ marginLeft: "-0.5rem", marginRight: "-0.5rem" }}
				>
					<Breadcrumb>
						<Breadcrumb.Item
							onClick={() => {
								resetQuestionEditModeFlag();
								nav({ pathname: "/Dashboard" });
							}}
						>
							Dashboard
						</Breadcrumb.Item>
						<Breadcrumb.Item
							className="text-overflow-ellipsis"
							style={{ maxWidth: 400 }}
							onClick={() => {
								resetQuestionEditModeFlag();
								nav(
									{ pathname: "/Dashboard/quiz" },
									{ state: { quizId: mbQuiz.flatMap(q => maybe(q.quiz?.uid)).orElse(toId("")) } }
								);
							}}
						>
							{mbQuiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}
						</Breadcrumb.Item>
						<Breadcrumb.Item active>{question.uid ? "Frage" : "Neue Frage"}</Breadcrumb.Item>
					</Breadcrumb>
				</div>

				{/**
				 * MARK: Comment-container
				 */}
				{showCommentSection ? (
					<CommentsContainer
						isQuizTeacher={isQuizTeacher}
						onClickToggleButton={() => setIsCommentSectionVisible(!isCommentSectionVisible)}
						isCommentSectionVisible={isCommentSectionVisible}
						onClickAddComment={() => handleMDShow("COMMENT", "edit-comment-text")}
						showCommentArea={showCommentArea}
					>
						{mbQuiz
							.flatMap(q => (keys(q.quiz).length > 0 ? maybe(q.quiz) : nothing()))
							.map(
								q =>
									(q.comments ?? [])
										.map(c => {
											const result = comments.find(
												cmt => cmt.uid === c && cmt.relatedQuestion === currentQuestionId
											);
											console.log(
												comments.map(c => c.relatedQuestion).join(";"),
												currentQuestionId,
												question.uid,
												result
											);
											return result;
										})
										.filter(Boolean) as Comment[]
							)
							.map(c =>
								c.sort(sortComments).map(cmt => (
									<div key={cmt.uid} style={{ width: "20rem", maxWidth: "95%" }}>
										<CommentCard
											isCommentSectionVisible={isCommentSectionVisible}
											userId={mbUser.flatMap(u => maybe(u.user?.uid)).orElse(toId(""))}
											teachers={mbQuiz.flatMap(q => maybe(q.quiz?.teachers)).orElse([])}
											comment={debug(cmt, `${mbQuiz.flatMap(q => maybe(q.questions))}`)}
											onUpvote={() => upvoteComment(cmt.uid)}
											onAccept={() => finishComment(cmt.uid)}
											onDelete={() => deleteComment(cmt.uid)}
											onJumpToQuestion={() => {}}
										/>
									</div>
								))
							)
							.orElse([<Fragment key={"key-1"} />])}
					</CommentsContainer>
				) : null}

				<div className="py-2 mb-4 mt-2 d-flex gap-3 flex-column flex-lg-row align-items-lg-center justify-content-between border-2 border-bottom">
					<span className="">
						<strong>
							{question.uid ? (
								<Trans id="question-edit-page.title.edit-question" />
							) : (
								<Trans id="question-edit-page.title.new-question" />
							)}
							:
						</strong>
					</span>
				</div>

				<Card className="overflow-hidden">
					<Card.Body className="d-flex flex-column gap-3 background-grey">
						{/**
						 * MARK: Author
						 */}
						{isStudent && writeAccess && (
							<Form.Group>
								<Form.Label className="m-0">{i18n._("author")}:</Form.Label>
								<Form.Select
									value={authorType}
									onChange={event => setAuthorType(event.target.value as UserParticipation)}
								>
									{allowedAuthorTypes.includes("NAME") && (
										<option value="NAME">
											{mbUser.flatMap(u => maybe(u.user?.username)).orElse("---")}
										</option>
									)}
									{allowedAuthorTypes.includes("NICKNAME") &&
										mbUser.flatMap(u => maybe(u.user?.nickname)).orElse("") !== "" && (
											<option value="NICKNAME">
												{mbUser.flatMap(u => maybe(u.user?.nickname)).orElse("---")}
											</option>
										)}
									{allowedAuthorTypes.includes("ANONYMOUS") && (
										<option value="ANONYMOUS">
											<Trans id="anonymous" />
										</option>
									)}
								</Form.Select>
							</Form.Group>
						)}

						{/**
						 * MARK: Question type
						 */}
						<Form.Group>
							<Form.Label>
								<Trans id="question-edit-page.input-label.question-type" />:
							</Form.Label>
							<Form.Select
								value={question.type}
								onChange={event =>
									setQuestion(state => ({
										...state,
										type: event.target.value as "SINGLE" | "MULTIPLE" | "TEXT",
									}))
								}
								disabled={!writeAccess}
							>
								{allowedQuestionTypes.includes("SINGLE") && (
									<option value="SINGLE">
										<Trans id="single-choice-selection" />
									</option>
								)}
								{allowedQuestionTypes.includes("MULTIPLE") && (
									<option value="MULTIPLE">
										<Trans id="multiple-choice-selection" />
									</option>
								)}
								{allowedQuestionTypes.includes("TEXT") && (
									<option value="TEXT">
										<Trans id="text-type-selection" />
									</option>
								)}
							</Form.Select>
						</Form.Group>

						{/* <Form.Group>
                            <Form.Label className="">
                                <Trans id="question-edit-page.input-label.group-name" />:
                            </Form.Label>
                            <Form.Select
                                value={selectedGroup}
                                onChange={event => setSelectedGroup(event.target.value)}
                                disabled={isStudent || !writeAccess}
                            >
                                {groups.map(g => (
                                    <option key={g} value={g}>
                                        {g}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group> */}
					</Card.Body>
				</Card>

				{/**
				 * MARK: Question:
				 */}
				<Card className="mt-3 overflow-hidden">
					<Card.Header className="p-3 d-flex justify-content-between align-items-center background-grey">
						<strong>
							<Trans id="question-edit-page.input-label.question" />:
						</strong>
					</Card.Header>

					<Card.Body
						// as="button"
						// onClick={() => handleMDShow("QUESTION", "edit-title-text")}
						className="bg-white border-0 overflow-hidden p-0"
					>
						<div className="d-flex flex-column flex-grow-1">
							{writeAccess && (
								<div data-color-mode="light">
									<MDEditor
										autoFocus
										commands={[
											commands.bold,
											commands.italic,
											commands.strikethrough,
											commands.divider,
											commands.link,
											commands.quote,
											commands.code,
											commands.divider,
											commands.unorderedListCommand,
											commands.orderedListCommand,
											commands.checkedListCommand,
											commands.divider,
											commands.help,
										]}
										textareaProps={{
											placeholder: i18n._("question-edit-page.input-label.question"),
										}}
										extraCommands={[]}
										value={question.text}
										onChange={val => setQuestion(prev => ({ ...prev, text: val ?? "" }))}
										height="100%"
										style={{ padding: 6 }}
										// eslint-disable-next-line @typescript-eslint/no-unused-vars
										components={{ preview: (_source, _state, _dispatch) => <></> }}
										preview="edit"
									/>
								</div>
							)}
							<div
								className="p-3 text-start h-30"
								style={{ minHeight: 120 }}
								dangerouslySetInnerHTML={{ __html: rendered }}
							/>
						</div>

						{/* {question.text ? (
                            <div className="p-2 text-start h-30" dangerouslySetInnerHTML={{ __html: rendered }} />
                        ) : (
                            <div
                                className="p-2 text-start h-30 d-flex justify-content-center align-items-center"
                                style={{ minHeight: 90 }}
                            > */}
						{/* <div>
                                    did not add any question yet ..
                                    <Button
                                        variant="link"
                                        className="p-0 m-0 mx-1"
                                        style={{ position: "relative", bottom: 2 }}
                                        onClick={() => handleMDShow("QUESTION", "edit-title-text")}
                                        disabled={!writeAccess}
                                    >
                                        add question
                                    </Button>
                                </div> */}
						{/* </div>
                        )} */}

						{/* <div className="d-flex justify-content-end">
                            <Button
                                variant="warning"
                                className="ps-1 col-12 col-lg-auto d-flex justify-content-center align-items-center"
                                onClick={() => handleMDShow("QUESTION", "edit-title-text")}
                                disabled={!writeAccess}
                            >
                                {question.text.trim() ? (
                                    <>
                                        <Pencil className="mx-2" />
                                        <Trans id="question-edit-page.button-label.edit" />
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        <Trans id="question-edit-page.button-label.add" />
                                    </>
                                )}
                            </Button>
                        </div> */}
					</Card.Body>

					<Card.Footer className="pb-4 background-grey pt-3">
						<Form.Group className="mt-3x">
							<Form.Label className="mb-2">
								<Trans id="question-edit-page.input-label.advisory-text" />:
							</Form.Label>
							<InputGroup className="mb-2">
								<Form.Check
									className="align-self-center"
									label=""
									name="answer"
									type="switch"
									checked={hint}
									onChange={event => {
										const active = event.target.checked;
										if (!active) {
											setQuestion(state => ({ ...state, hint: undefined }));
										}
										setHint(active);
									}}
									disabled={!writeAccess}
								/>

								{/* <InputGroup.Text className="flex-grow-1">{question.hint ?? ""}</InputGroup.Text> */}
								<Form.Control
									value={question.hint ?? ""}
									disabled={!hint}
									onChange={e => {
										console.log({ value: e.target.value, question: question });
										const text = e.target.value;

										setQuestion(state => {
											console.log({ state });

											// eslint-disable-next-line @typescript-eslint/no-explicit-any
											// (state as any)[showTextModal.property] = text;
											return { ...state, hint: text };
										});
									}}
								/>

								{/* <ButtonWithTooltip
                                    title={i18n._("question-edit.button-tooltip.edit-hint-title")}
                                    disabled={!hint || !writeAccess}
                                    onClick={() =>
                                        setShowTextModal({
                                            property: "hint",
                                            titleId: "edit-hint-title",
                                            editorText: question.hint ?? "",
                                        })
                                    }
                                >
                                    <Pencil />
                                </ButtonWithTooltip> */}
							</InputGroup>
						</Form.Group>

						{/* <Form.Group>
                            <Form.Label className="my-2">
                                <Trans id="question-edit-page.input-label.question-type" />:
                            </Form.Label>
                            <Form.Select
                                value={question.type}
                                onChange={event =>
                                    setQuestion(state => ({
                                        ...state,
                                        type: event.target.value as "SINGLE" | "MULTIPLE" | "TEXT",
                                    }))
                                }
                                disabled={!writeAccess}
                            >
                                {allowedQuestionTypes.includes("SINGLE") && (
                                    <option value="SINGLE">
                                        <Trans id="single-choice-selection" />
                                    </option>
                                )}
                                {allowedQuestionTypes.includes("MULTIPLE") && (
                                    <option value="MULTIPLE">
                                        <Trans id="multiple-choice-selection" />
                                    </option>
                                )}
                                {allowedQuestionTypes.includes("TEXT") && (
                                    <option value="TEXT">
                                        <Trans id="text-type-selection" />
                                    </option>
                                )}
                            </Form.Select>
                        </Form.Group> */}

						{/**
						 * MARK: Answers
						 */}
						{question.type !== "TEXT" && (
							<div className="mt-3">
								<hr />

								<div className="mt-4 pb-1 d-flex gap-2 flex-column flex-lg-row align-items-lg-center justify-content-between">
									<Trans id="activate-all-correct-answers" />
									<div className="d-flex flex-row flex-wrap">
										{/* {isQuizTeacher && !shuffleAnswers ? ( */}
										{isActivateReorderAnswersVisible ? (
											<Button
												className="d-flex flex-grow-1 flex-lg-grow-0 justify-content-center align-items-center gap-2 me-2"
												variant={question.answerOrderFixed ? "outline-primary" : "primary"}
												disabled={!writeAccess}
												onClick={() =>
													setQuestion(prev => ({
														...prev,
														answerOrderFixed: !question.answerOrderFixed,
													}))
												}
											>
												<ArrowDownUp />
												{question.answerOrderFixed ? (
													<Trans id="answer-movement-functionality-activate" />
												) : (
													<Trans id="answer-movement-functionality-disable" />
												)}
											</Button>
										) : null}
										<Button
											variant="warning"
											onClick={addAnswer}
											disabled={
												!writeAccess || question.answers.length >= MAX_ANSWER_COUNT_ALLOWED
											}
										>
											<Trans id="add-answer-button" />
										</Button>
									</div>
								</div>

								{/* <hr /> */}

								{/* <hr /> */}

								{/* <Form className="text-start mt-4"> */}
								<div className="text-start mt-4">
									{question.answers.map((answer, i, arr) => {
										const isFirst = i === 0;
										const isLast = i === arr.length - 1;

										return (
											<InputGroup key={i} className="mb-2 mt-2">
												<Form.Check
													className="align-self-center"
													label=""
													name="answer"
													type="switch"
													// checked={answer.correct}
													checked={
														isQuizStateStarted
															? !isStudent && answer.correct
															: answer.correct
													}
													onChange={() => toggleAnswer(i)}
													disabled={!writeAccess}
												/>
												{/* <InputGroup.Text className="flex-grow-1">{answer.text}</InputGroup.Text> */}
												<Form.Control
													disabled={!writeAccess}
													value={answer.text}
													autoFocus={!answer.text} // only focus when new answer is added
													onChange={e => {
														const text = e.target.value;
														const answers = question.answers;
														answers[i].text = text;
														setQuestion(state => ({ ...state, answers }));
													}}
												/>

												{/* {!question.answerOrderFixed ? ( */}
												{isActivateReorderAnswersVisible && !question.answerOrderFixed ? (
													<div className="mx-1 d-flex gap-1">
														<Button
															className="rounded-0"
															disabled={isFirst}
															variant="outline-primary"
															onClick={() => moveAnswer(i, true)}
														>
															<ArrowUp />
														</Button>
														<Button
															className="rounded-0"
															disabled={isLast}
															variant="outline-primary"
															onClick={() => moveAnswer(i, false)}
														>
															<ArrowDown />
														</Button>
													</div>
												) : null}

												{/* <ButtonWithTooltip
                                                    title={i18n._("question-edit.button-tooltip.edit-answer")}
                                                    onClick={() => editAnswer(i)}
                                                    disabled={!writeAccess}
                                                >
                                                    <Pencil />
                                                </ButtonWithTooltip> */}
												<ButtonWithTooltip
													title={i18n._("question-edit.button-tooltip.delete-answer")}
													variant="danger"
													onClick={() => deleteAnswer(i)}
													disabled={!writeAccess}
												>
													<DashLg />
												</ButtonWithTooltip>
											</InputGroup>
										);
									})}
								</div>
								{/* </Form> */}
							</div>
						)}
					</Card.Footer>
				</Card>

				<div className="mt-4 d-flex flex-column-reverse flex-lg-row gap-2 justify-content-end">
					{/* <ButtonWithTooltip
                            title={i18n._("question-edit.button-tooltip.check")}
                            variant="secondary"
                            disabled
                        >
                            <Check />
                        </ButtonWithTooltip> */}

					<Button variant="outline-primary" onClick={onCancelClick}>
						<Trans id="cancel" />
					</Button>

					{question.uid && isQuizStateEditing && isQuizTeacher && !isLastQuestion ? (
						<Button onClick={handleSaveAndGoToNextQuestion}>
							<Trans id="save-and-go-to-next-question-button" />
						</Button>
					) : null}

					<ButtonWithTooltip
						isTooltipVisibleWhenButtonIsDisabled={!!saveButtonDisableReason}
						title={saveButtonDisableReason}
						disabled={isSaveButtonDisabled}
						onClick={() => submitAndNavigateBack(true)}
						className="col-12 col-lg-auto"
					>
						{writeAccess ? <Trans id="save-question-button" /> : <Trans id="back-to-quiz-button" />}
					</ButtonWithTooltip>
				</div>
			</div>
		</>
	);
};
