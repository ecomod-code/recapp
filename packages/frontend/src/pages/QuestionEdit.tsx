import { Fragment, useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { useLocation, useNavigate } from "react-router-dom";
import { Maybe, maybe, nothing } from "tsmonads";
import { Trans } from "@lingui/react";
import { keys } from "rambda";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, toId, Comment, Question, Id, QuestionType, UserParticipation } from "@recapp/models";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { Check, DashLg, Pencil } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../components/ButtonWithTooltip";
import { CommentCard } from "../components/cards/CommentCard";
import { MarkdownModal } from "../components/modals/MarkdownModal";
import { TextModal } from "../components/modals/TextModal";
import { CommentsContainer } from "../components/cards/CommentsContainer";
import { CurrentQuizMessages } from "../actors/CurrentQuizActor";
import { toTimestamp, debug } from "itu-utils";
import { CommentEditorModal } from "../components/modals/CommentEditorModal";

const sortComments = (a: Comment, b: Comment) => {
	if (a.answered && !b.answered) return 1;
	if (!a.answered && b.answered) return -1;
	if (a.upvoters.length !== b.upvoters.length) return b.upvoters.length - a.upvoters.length;
	return b.updated.value - a.updated.value;
};

export const QuestionEdit: React.FC = () => {
	const { state } = useLocation();
	const questionId = state?.quizId ?? "";
	const formerGroup = state?.group ?? "";
	const writeAccess = state?.write === "true" ?? false;
	const [mbQuiz, tryQuizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[]; questions: Question[] }>(
		"CurrentQuiz"
	);
	const [mbUser] = useStatefulActor<{ user: User }>("LocalUser");

	const [question, setQuestion] = useState<Omit<Question, "uid" | "created" | "updated" | "authorID"> & { uid?: Id }>(
		{
			text: "",
			type: "TEXT",
			authorId: toId(""),
			answers: [],
			approved: false,
			editMode: true,
			quiz: toId(""),
		}
	);
	const [hint, setHint] = useState(false);
	const [groups, setGroups] = useState<string[]>([]);
	const [selectedGroup, setSelectedGroup] = useState("");
	const [allowedQuestionTypes, setAllowedQuestionTypes] = useState<string[]>([]);
	const [allowedAuthorTypes, setAllowedAuthorTypes] = useState<UserParticipation[]>([]);
	const [authorType, setAuthorType] = useState<UserParticipation>("ANONYMOUS");
	const nav = useNavigate();
	const students = mbQuiz.flatMap(q => maybe(q.quiz)).map(q => q.students);
	const isStudent = mbUser.map(u => students.map(s => s.includes(u.user.uid)).orElse(false)).orElse(false);

	useEffect(() => {
		if (mbQuiz.isEmpty()) {
			return;
		}
		const quiz = mbQuiz.orUndefined();

		const groups = quiz?.quiz?.groups?.map(g => g.name);
		if (groups) {
			const aat: UserParticipation[] = keys(quiz?.quiz.studentParticipationSettings)
				.filter(k => !!quiz?.quiz.studentParticipationSettings[k as UserParticipation])
				.map(k => k as UserParticipation);

			setAllowedAuthorTypes(aat);
			if (!aat.includes("ANONYMOUS")) {
				if (!aat.includes("NICKNAME")) {
					setAuthorType("NAME");
				} else {
					setAuthorType("NICKNAME");
				}
			}

			const aqt: QuestionType[] = keys(quiz?.quiz.allowedQuestionTypesSettings)
				.filter(k => !!quiz?.quiz.allowedQuestionTypesSettings[k as QuestionType])
				.map(k => k as QuestionType);

			setAllowedQuestionTypes(aqt);

			if (questionId) {
				const editQuestion: Partial<Question> = quiz?.questions?.find(q => q.uid === questionId) ?? {};
				const newType: QuestionType = aqt.includes(editQuestion.type ?? question.type)
					? editQuestion.type ?? question.type
					: aqt[0];

				setQuestion({ ...question, ...editQuestion, type: newType });
				setHint(!!editQuestion.hint);
				if (writeAccess) {
					tryQuizActor.forEach(actor =>
						actor.send(
							actor,
							CurrentQuizMessages.UpdateQuestion({
								question: { uid: questionId, editMode: true },
								group: "", // formerGroup,
							})
						)
					);
				}
			} else {
				const newType: QuestionType = aqt.includes(question.type) ? question.type : aqt[0];

				setQuestion({ ...question, quiz: quiz?.quiz?.uid ?? toId(""), type: newType });
			}
			if (formerGroup) {
				setSelectedGroup(formerGroup);
			} else {
				setSelectedGroup(groups[0]);
			}
			setGroups(groups);
		}
	}, [mbQuiz.hasValue]);

	const [rendered, setRendered] = useState<string>("");
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

	useEffect(() => {
		const f = async () => {
			const result = await unified()
				.use(remarkParse)
				.use(remarkMath)
				.use(remarkRehype)
				.use(rehypeKatex)
				.use(rehypeStringify)
				.process(question.text);
			setRendered(result.toString());
		};
		f();
	}, [question.text]);

	const addAnswer = () => {
		const answers = question.answers;
		answers.push({ correct: false, text: "" });
		setQuestion(state => ({ ...state, answers }));
		editAnswer(answers.length - 1);
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

	const editAnswer = (index: number) => {
		setShowTextModal({
			titleId: "edit-answer-text",
			property: `answer-${index}`,
			editorText: question.answers[index].text,
		});
	};

	const resetQuestionEditModeFlag = () => {
		if (writeAccess) {
			tryQuizActor.forEach(actor =>
				actor.send(
					actor.name,
					CurrentQuizMessages.UpdateQuestion({
						question: { uid: toId(questionId), editMode: false },
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

	const submit = async () => {
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
				if (questionId) {
					actor.send(
						actor.name,
						CurrentQuizMessages.UpdateQuestion({
							question: { ...quizQuestion, uid: toId(questionId) },
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
		nav(
			{ pathname: "/Dashboard/quiz" },
			{
				state: {
					quizId: mbQuiz.flatMap(q => maybe(q.quiz?.uid)).orElse(toId("")),
				},
			}
		);
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

	const userName = mbUser.flatMap(u => maybe(u.user.username)).orElse("---");
	const userNickname = mbUser.flatMap(u => maybe(u.user.nickname)).orUndefined();

	const addComment = (value: string, name?: string) => {
		const c: Omit<Comment, "authorId" | "uid"> = {
			text: value,
			authorName: name ?? userName,
			created: toTimestamp(),
			updated: toTimestamp(),
			upvoters: [],
			answered: false,
			relatedQuiz: question.quiz,
			relatedQuestion: question.uid,
		};
		tryQuizActor.forEach(q => q.send(q, CurrentQuizMessages.AddComment(c)));
		handleClose();
	};

	const deleteComment = (commentId: Id) => {
		tryQuizActor.forEach(actor => {
			actor.send(actor, CurrentQuizMessages.DeleteComment(commentId));
		});
	};

	const comments: Comment[] = mbQuiz.map(q => q.comments).orElse([]);

	const showCommentArea =
		!mbQuiz.flatMap(q => maybe(q.quiz.hideComments)).orElse(false) ||
		(!isStudent && mbQuiz.flatMap(q => maybe(q.quiz.state)).orElse("EDITING") === "EDITING");

	return (
		<Container fluid>
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
			<MarkdownModal
				titleId={showMDModal.titleId}
				editorValue={showMDModal.type === "QUESTION" ? question.text : ""}
				show={!!showMDModal.titleId && showMDModal.type === "QUESTION"}
				onClose={handleClose}
				onSubmit={text => {
					setQuestion(state => ({ ...state, text }));
					handleClose();
				}}
			/>
			<CommentEditorModal
				titleId={showMDModal.titleId}
				editorValue={showMDModal.type === "QUESTION" ? question.text : ""}
				show={!!showMDModal.titleId && showMDModal.type !== "QUESTION"}
				onClose={handleClose}
				isStudent={isStudent}
				userNames={[userName, userNickname ?? ""]}
				participationOptions={allowedAuthorTypes}
				onSubmit={(text, name) => {
					addComment(text, name);
					handleClose();
				}}
			/>
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
					<Breadcrumb.Item>{question.uid ? "Frage" : "Neue Frage"}</Breadcrumb.Item>
				</Breadcrumb>
			</div>

			<Row className="mb-4">
				<div className="mt-3 d-flex gap-2 justify-content-end">
					<Button variant="secondary" onClick={onCancelClick}>
						<Trans id="cancel" />
					</Button>
					<Button disabled={!question.text.trim()} onClick={submit}>
						{writeAccess ? <Trans id="save-question-button" /> : <Trans id="back-to-quiz-button" />}
					</Button>
				</div>
			</Row>

			<Row>
				<div className="d-flex flex-column h-100 w-100">
					<div className="flex-grow-1">
						<Container>
							<Card className="p-0">
								<Card.Header className="text-start d-flex flex-row">
									<div className="align-self-center">
										<strong>{question.uid ? "Frage" : "Neue Frage"}</strong>
									</div>
									<div className="flex-grow-1"></div>
									{isStudent && writeAccess && (
										<div className="align-self-center d-flex flex-row align-items-center">
											{i18n._("author")}:&nbsp;
											<Form.Select
												value={authorType}
												onChange={event =>
													setAuthorType(event.target.value as UserParticipation)
												}
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
										</div>
									)}
									<div className="align-self-center">
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
									</div>
									<div className="align-self-center">
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
									</div>
									<div className="m-1">
										<ButtonWithTooltip
											title={i18n._("question-edit.button-tooltip.check")}
											variant="secondary"
											disabled
										>
											<Check />
										</ButtonWithTooltip>
										&nbsp;
										<ButtonWithTooltip
											title={i18n._("question-edit.button-tooltip.edit-title-text")}
											variant="primary"
											onClick={() => handleMDShow("QUESTION", "edit-title-text")}
											disabled={!writeAccess}
										>
											<Pencil />
										</ButtonWithTooltip>
									</div>
								</Card.Header>
								<Card.Body>
									{question.text ? (
										<div
											className="p-2 text-start h-30"
											dangerouslySetInnerHTML={{ __html: rendered }}
										/>
									) : (
										<div className="p-2 text-start h-30" style={{ minHeight: 90 }} />
									)}
									<div className="mb-2">Hinweistext:</div>
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
										<InputGroup.Text className="flex-grow-1">{question.hint ?? ""}</InputGroup.Text>
										<ButtonWithTooltip
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
										</ButtonWithTooltip>
									</InputGroup>
								</Card.Body>
								{question.type !== "TEXT" && (
									<Card.Footer>
										<Trans id="activate-all-correct-answers" />
										<Form className="text-start mb-2 mt-2">
											{question.answers.map((answer, i) => {
												return (
													<InputGroup key={i} className="mb-2">
														<Form.Check
															className="align-self-center"
															label=""
															name="answer"
															type="switch"
															checked={answer.correct}
															onChange={() => toggleAnswer(i)}
															disabled={!writeAccess}
														/>
														<InputGroup.Text className="flex-grow-1">
															{answer.text}
														</InputGroup.Text>
														<ButtonWithTooltip
															title={i18n._("question-edit.button-tooltip.edit-answer")}
															onClick={() => editAnswer(i)}
															disabled={!writeAccess}
														>
															<Pencil />
														</ButtonWithTooltip>
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
										</Form>
										<Button onClick={addAnswer} disabled={!writeAccess}>
											<Trans id="add-answer-button" />
										</Button>
									</Card.Footer>
								)}
							</Card>
						</Container>
					</div>
				</div>
				<Row>
					<div className="flew-grow-1">&nbsp;</div>
				</Row>
			</Row>

			<div className="mx-3">
				<CommentsContainer
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
											cmt => cmt.uid === c && cmt.relatedQuestion === questionId
										);
										console.log(
											comments.map(c => c.relatedQuestion).join(";"),
											questionId,
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
										userId={mbUser.flatMap(u => maybe(u.user?.uid)).orElse(toId(""))}
										teachers={mbQuiz.flatMap(q => maybe(q.quiz?.teachers)).orElse([])}
										comment={debug(cmt, `${mbQuiz.map(q => q.questions)}`)}
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
			</div>
		</Container>
	);
};
