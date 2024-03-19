import MDEditor, { commands } from "@uiw/react-md-editor";
import { Fragment, ReactNode, useEffect, useState } from "react";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { i18n } from "@lingui/core";
import { unified } from "unified";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, toId, Comment, Question, questionSchema, Id } from "@recapp/models";
import {
	Badge,
	Offcanvas,
	Button,
	Card,
	Container,
	Row,
	Accordion,
	AccordionItem,
	AccordionBody,
	Breadcrumb,
	Tab,
	Tabs,
	Form,
	Alert,
	InputGroup,
} from "react-bootstrap";
import {
	ArrowDown,
	ArrowUp,
	ChatFill,
	Check,
	DashLg,
	NodeMinus,
	Pencil,
	PersonRaisedHand,
} from "react-bootstrap-icons";
import { CurrentQuizMessages } from "../actors/CurrentQuizActor";
import { CommentCard } from "../components/cards/CommentCard";
import { matchRoutes, useNavigate, useNavigation, useSearchParams } from "react-router-dom";
import { maybe, nothing } from "tsmonads";
import { Trans } from "@lingui/react";
import { add, isEmpty } from "rambda";
import { MarkdownModal } from "../components/modals/MarkdownModal";
import { TextModal } from "../components/modals/TextModal";
import { DateTime } from "luxon";

export const QuestionEdit: React.FC = () => {
	const questionId = useSearchParams()[0].get("q");
	const formerGroup = useSearchParams()[0].get("g");
	const [mbQuiz, tryQuizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[]; questions: Question[] }>(
		"CurrentQuiz"
	);
	const [mbUser] = useStatefulActor<{ user: User }>("LocalUser");

	const [question, setQuestion] = useState<Omit<Question, "uid" | "created" | "updated" | "authorID">>({
		text: "",
		type: "TEXT",
		authorId: toId(""),
		answers: [],
		approved: false,
		editMode: true,
		quiz: toId(""),
	});
	const [hint, setHint] = useState(false);
	const [groups, setGroups] = useState<string[]>([]);
	const [selectedGroup, setSelectedGroup] = useState("");
	const nav = useNavigate();

	useEffect(() => {
		if (mbQuiz.isEmpty()) {
			return;
		}
		const quiz = mbQuiz.orUndefined();

		const groups = quiz?.quiz?.groups?.map(g => g.name);
		if (groups) {
			if (questionId) {
				const editQuestion = quiz?.questions?.find(q => q.uid === questionId) ?? {};
				setQuestion({ ...question, ...editQuestion });
			} else {
				setQuestion({ ...question, quiz: quiz?.quiz?.uid ?? toId("") });
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
	const [showMDModal, setShowMDModal] = useState(false);
	const [showTextModal, setShowTextModal] = useState({ property: "", titleId: "" });

	const handleClose = () => {
		setShowMDModal(false);
		setShowTextModal({ property: "", titleId: "" });
	};
	const handleShow = (property: string = "", titleId: string = "") => {
		setShowMDModal(true);
		setShowTextModal({ property, titleId });
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
		let answers = question.answers;
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
		setShowTextModal({ titleId: "edit-answer-text", property: `answer-${index}` });
	};

	const submit = async () => {
		const quizQuestion = { ...question };
		if (quizQuestion.type === "TEXT") {
			quizQuestion.answers = [];
		}
		const user = mbUser.map(u => u.user);
		user.match(
			userData => {
				quizQuestion.authorId = userData.uid;
				quizQuestion.authorName = userData.username;
			},
			() => {}
		);

		await tryQuizActor.map(async actor => {
			if (questionId) {
				await actor.send(
					actor.name,
					CurrentQuizMessages.UpdateQuestion({
						question: { ...quizQuestion, uid: toId(questionId) },
						group: selectedGroup,
					})
				);
			} else {
				await actor.send(
					actor.name,
					CurrentQuizMessages.AddQuestion({ question: quizQuestion, group: selectedGroup })
				);
			}
		});
		nav(-1);
	};

	return (
		<Container fluid>
			<TextModal
				titleId={showTextModal.titleId}
				show={!!showTextModal.titleId}
				editorValue={(question as any)[showTextModal.property]}
				onClose={handleClose}
				onSubmit={text => {
					if (showTextModal.property.startsWith("answer-")) {
						const index = parseInt(showTextModal.property.replace("answer-", ""));
						const answers = question.answers;
						answers[index].text = text;
						setQuestion(state => ({ ...state, answers }));
					} else {
						setQuestion(state => {
							(state as any)[showTextModal.property] = text;
							return { ...state };
						});
					}
					handleClose();
				}}
			/>
			<MarkdownModal
				titleId="edit-question-text"
				editorValue={question.text}
				show={showMDModal}
				onClose={handleClose}
				onSubmit={text => {
					setQuestion(state => ({ ...state, text }));
					handleClose();
				}}
			/>
			<div
				className="d-flex flew-row flex-nowrap align-items-center mb-2"
				style={{ marginLeft: "-0.5rem", marginRight: "-0.5rem" }}
			>
				<Breadcrumb>
					<Breadcrumb.Item href="/Dashboard">Dashboard</Breadcrumb.Item>
					<Breadcrumb.Item
						href={`/Dashboard/quiz${mbQuiz
							.flatMap(q => maybe(q.quiz?.uid))
							.map(s => "?q=" + s)
							.orElse("")}`}
					>
						{mbQuiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}
					</Breadcrumb.Item>
					<Breadcrumb.Item>Neue Frage</Breadcrumb.Item>
				</Breadcrumb>
			</div>
			<Row>
				<div className="d-flex flex-column h-100 w-100">
					<div className="flex-grow-1">
						<Container>
							<Card className="p-0">
								<Card.Header className="text-start d-flex flex-row">
									<div className="align-self-center">
										<strong>Neue Frage</strong>
									</div>
									<div className="flex-grow-1"></div>
									<div className="align-self-center">
										<Form.Select
											value={selectedGroup}
											onChange={event => setSelectedGroup(event.target.value)}
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
										>
											<option value="SINGLE">Einzelauswahl</option>
											<option value="MULTIPLE">Mehrfachauswahl</option>
											<option value="TEXT">Freitext</option>
										</Form.Select>
									</div>
									<div className="m-1">
										<Button variant="light" disabled>
											<Check />
										</Button>
										&nbsp;
										<Button variant="primary" onClick={() => handleShow()}>
											<Pencil />
										</Button>
										&nbsp;
										<Button variant="secondary">
											<PersonRaisedHand />
										</Button>
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
										/>
										<InputGroup.Text className="flex-grow-1">{question.hint ?? ""}</InputGroup.Text>
										<Button
											disabled={!hint}
											onClick={() =>
												setShowTextModal({ property: "hint", titleId: "edit-hint-title" })
											}
										>
											<Pencil />
										</Button>
									</InputGroup>
								</Card.Body>
								{question.type !== "TEXT" && (
									<Card.Footer>
										Aktiviere alle <em>richtigen</em> Antworten
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
														/>
														<InputGroup.Text className="flex-grow-1">
															{answer.text}
														</InputGroup.Text>
														<Button>
															<Pencil onClick={() => editAnswer(i)} />
														</Button>
														<Button variant="danger" onClick={() => deleteAnswer(i)}>
															<DashLg />
														</Button>
													</InputGroup>
												);
											})}
										</Form>
										<Button onClick={addAnswer}>Antwort hinzufügen</Button>
									</Card.Footer>
								)}
							</Card>
						</Container>
					</div>
				</div>
				<Row>
					<div className="flew-grow-1">&nbsp;</div>
				</Row>
				<div
					className="d-flex flex-row"
					style={{
						maxHeight: "19rem",
						overflowY: "hidden",
						overflowX: "auto",
						backgroundColor: "#f5f5f5",
					}}
				>
					{mbQuiz
						.map(q => q.comments)
						.map(c =>
							c.map(cmt => (
								<div key={cmt.uid} style={{ width: "20rem", maxWidth: "95%" }}>
									<CommentCard comment={cmt} />
								</div>
							))
						)
						.orElse([<Fragment />])}
				</div>
			</Row>
			<Row>
				<div className="d-flex flex-column h-100 w-100">
					<Button className="m-3" onClick={submit}>
						Frage speichern
					</Button>
				</div>
			</Row>
		</Container>
	);
};
