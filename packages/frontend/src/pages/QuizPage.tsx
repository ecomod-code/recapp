import { Fragment, useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, toId, Comment, Question, QuestionGroup, Id } from "@recapp/models";
import { Badge, Button, Card, Container, Row, Accordion, Breadcrumb, Tab, Tabs, Form } from "react-bootstrap";
import { ArrowDown, ArrowUp, ChatFill, Check, Pencil, TrainFront } from "react-bootstrap-icons";
import { CurrentQuizMessages } from "../actors/CurrentQuizActor";
import { CommentCard } from "../components/cards/CommentCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { maybe, nothing } from "tsmonads";
import { keys } from "rambda";
import { QuizData } from "../components/tabs/QuizData";
import { CreateGroupModal } from "../components/modals/CreateGroupModal";
import { ChangeGroupModal } from "../components/modals/ChangeGroupModal";
const QuestionCard = (props: {
	question: Question;
	moveUp: () => void;
	moveDown: () => void;
	approve: () => void;
	edit: () => void;
	changeGroup: () => void;
	disabled: boolean;
	currentUserUid: Id;
}) => {
	return (
		<Card className="p-0">
			<Card.Body as="div" className="p-0 m-0 d-flex flex-row align-items-center">
				<div className="d-flex flex-column h-100 me-1">
					<div>
						<Button variant="light" size="sm" onClick={props.moveUp} disabled={props.disabled}>
							<ArrowUp />
						</Button>
					</div>
					<div className="flex-grow-1">&nbsp;</div>
					<div>
						<Button variant="light" size="sm" onClick={props.moveDown} disabled={props.disabled}>
							<ArrowDown />
						</Button>
					</div>
				</div>
				<div
					className="flex-grow-1 text-start p-2 me-2"
					dangerouslySetInnerHTML={{ __html: props.question.text }}
				/>
				<div className="d-flex flex-column h-100">
					<Badge as="div" className="mt-2 me-2" bg="info">
						{props.question.type}
					</Badge>
					<div className="me-2"> von {props.question.authorName} </div>
					<div className="mt-0">
						<Button
							className="m-2"
							onClick={props.edit}
							disabled={
								props.question.editMode ||
								(props.disabled &&
									(props.question.authorId !== props.currentUserUid || props.question.approved))
							}
						>
							<Pencil />
						</Button>
						<Button className="m-2" onClick={props.changeGroup} disabled={props.disabled}>
							<TrainFront />
						</Button>
						<Button
							className="m-2"
							variant={props.question.approved ? "success" : "warning"}
							onClick={props.approve}
							disabled={props.disabled}
						>
							<Check />
						</Button>
					</div>
				</div>
			</Card.Body>
		</Card>
	);
};

export const QuizPage: React.FC = () => {
	const nav = useNavigate();
	const quizId = useSearchParams()[0].get("q");
	const [localUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [mbQuiz, tryQuizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[]; questions: Question[] }>(
		"CurrentQuiz"
	);
	useEffect(() => {
		if (!quizId) {
			return;
		}
		tryQuizActor.forEach(q => {
			localUser.forEach(lu => {
				q.send(q, CurrentQuizMessages.SetUser(lu.user));
				q.send(q, CurrentQuizMessages.SetQuiz(toId(quizId)));
			});
		});
	}, [quizId, tryQuizActor.hasValue]);

	const [currentGroup, setCurrentGroup] = useState({
		showNameModal: false,
		name: "",
	});
	const [changeGroup, setChangeGroup] = useState({
		qId: "",
		currentGroup: "",
	});

	const questions: Question[] = mbQuiz.map(q => q.questions).orElse([]);

	return mbQuiz
		.flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
		.match(
			quizData => {
				const addGroup = (name: string) => {
					const newGroups = [...quizData.quiz.groups];
					const editedGroup = newGroups.find(g => g.name === currentGroup.name);
					if (editedGroup) editedGroup.name = name;
					else newGroups.push({ name, questions: [] });
					setCurrentGroup({ showNameModal: false, name: "" });
					tryQuizActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update({ groups: newGroups })));
				};

				const moveGroup = (name: string, upwards: boolean) => {
					let newGroups: QuestionGroup[] = [];
					const groupIndex = quizData.quiz.groups.findIndex(g => g.name === name);
					const changeIndex = upwards ? groupIndex - 1 : groupIndex + 1;
					quizData.quiz.groups.forEach((group, index) => {
						if (index === groupIndex) {
							return;
						}
						if (index === changeIndex) {
							if (upwards) {
								newGroups.push(quizData.quiz.groups[groupIndex]);
								newGroups.push(group);
							} else {
								newGroups.push(group);
								newGroups.push(quizData.quiz.groups[groupIndex]);
							}
						} else {
							newGroups.push(group);
						}
					});
					tryQuizActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update({ groups: newGroups })));
				};

				const moveQuestion = (groupName: string, qId: Id, upwards: boolean) => {
					let newOrder: Id[] = [];
					const group = quizData.quiz.groups.find(g => g.name === groupName)!;
					const questionIndex = group.questions.findIndex(g => g === qId);
					const changeIndex = upwards ? questionIndex - 1 : questionIndex + 1;
					group.questions.forEach((qid, index) => {
						if (index === questionIndex) {
							return;
						}
						if (index === changeIndex) {
							if (upwards) {
								newOrder.push(group.questions[questionIndex]);
								newOrder.push(qid);
							} else {
								newOrder.push(qid);
								newOrder.push(group.questions[questionIndex]);
							}
						} else {
							newOrder.push(qid);
						}
					});
					group.questions = newOrder;
					tryQuizActor.forEach(a =>
						a.send(a.name, CurrentQuizMessages.Update({ groups: quizData.quiz.groups }))
					);
				};

				const approveQuestion = (uid: Id, approved: boolean) => {
					tryQuizActor.forEach(a =>
						a.send(
							a.name,
							CurrentQuizMessages.UpdateQuestion({ question: { uid, approved: !approved }, group: "" })
						)
					);
				};

				const editQuestion = (uid: Id, group: string) => {
					nav(`/Dashboard/Question?q=${uid}&g=${group}`);
				};

				const allowed = (user: User) => {
					if (user.role === "STUDENT") {
						return true;
					}
					if (user.role === "TEACHER" && !quizData.quiz.teachers.includes(user.uid)) {
						return true;
					}
					return false;
				};

				const disableForStudent = localUser.map(u => allowed(u.user)).orElse(true);

				return (
					<Container fluid>
						<ChangeGroupModal
							show={!!changeGroup.currentGroup}
							groups={quizData.quiz.groups.map(g => g.name)}
							currentGroup={changeGroup.currentGroup}
							onClose={() => setChangeGroup({ currentGroup: "", qId: "" })}
							onSubmit={newGroup => {
								tryQuizActor.forEach(actor =>
									actor.send(
										actor.name,
										CurrentQuizMessages.UpdateQuestion({
											question: { uid: toId(changeGroup.qId) },
											group: newGroup,
										})
									)
								);
								setChangeGroup({ currentGroup: "", qId: "" });
							}}
						/>
						<CreateGroupModal
							show={currentGroup.showNameModal}
							invalidValues={quizData.quiz.groups.map(g => g.name).filter(n => n !== currentGroup.name)}
							onClose={() => setCurrentGroup({ showNameModal: false, name: "" })}
							onSubmit={addGroup}
							defaultValue={currentGroup.name}
						/>
						<Row>
							<Breadcrumb>
								<Breadcrumb.Item href="/Dashboard">Dashboard</Breadcrumb.Item>
								<Breadcrumb.Item>
									{mbQuiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}
								</Breadcrumb.Item>
							</Breadcrumb>
						</Row>
						<Tabs defaultActiveKey="questions" className="mb-3 w-100 h-100">
							{!disableForStudent && (
								<Tab eventKey="quizdata" title={i18n._("quiz-tab-label-data")}>
									<QuizData />
								</Tab>
							)}
							<Tab eventKey="questions" title={i18n._("quiz-tab-label-questions")}>
								<Row>
									<div className="d-flex flex-column h-100 w-100">
										<div style={{ backgroundColor: "#f5f5f5" }}>
											<div
												className="d-xs-none d-sm-none d-md-none d-lg-flex flex-row"
												style={{
													maxHeight: "19rem",
													overflowY: "hidden",
													overflowX: "auto",
												}}
											>
												{mbQuiz
													.map(q => q.comments)
													.map(c =>
														c.map(cmt => (
															<div key={cmt.uid} style={{ width: "18rem" }}>
																<CommentCard comment={cmt} />
															</div>
														))
													)
													.orElse([<Fragment />])}
											</div>
										</div>
										<div className="flex-grow-1">
											<Accordion defaultActiveKey="0">
												{quizData.quiz.groups.map((questionGroup, index) => {
													return (
														<Accordion.Item
															key={questionGroup.name}
															eventKey={questionGroup.name}
														>
															<Accordion.Header>
																<div
																	className="d-flex w-100 align-items-center"
																	style={{ margin: "-0.5rem" }}
																>
																	<div className="d-flex flex-column h-100 me-1">
																		<div>
																			<Button
																				variant="light"
																				size="sm"
																				disabled={index === 0}
																				onClick={() =>
																					moveGroup(questionGroup.name, true)
																				}
																			>
																				<ArrowUp />
																			</Button>
																		</div>
																		<div>&nbsp;</div>
																		<div>
																			<Button
																				variant="light"
																				size="sm"
																				disabled={
																					index ===
																					quizData.quiz.groups.length - 1
																				}
																				onClick={() =>
																					moveGroup(questionGroup.name, false)
																				}
																			>
																				<ArrowDown />
																			</Button>
																		</div>
																	</div>
																	<div className="flex-grow-1">
																		<strong>{questionGroup.name}</strong>
																	</div>
																	<Button
																		as="div"
																		className="me-4"
																		onClick={() =>
																			setCurrentGroup({
																				showNameModal: true,
																				name: questionGroup.name,
																			})
																		}
																	>
																		<Pencil />
																	</Button>
																</div>
															</Accordion.Header>
															<Accordion.Body className="p-2">
																<div
																	className="d-flex flex-column"
																	style={{ maxHeight: "70vh", overflowY: "auto" }}
																>
																	{questionGroup.questions
																		.map(q => questions.find(qu => qu.uid === q))
																		.filter(Boolean)
																		.map((q, i) => {
																			return (
																				<QuestionCard
																					question={q!}
																					key={q!.uid}
																					approve={() =>
																						approveQuestion(
																							q!.uid,
																							q!.approved
																						)
																					}
																					edit={() =>
																						editQuestion(
																							q!.uid,
																							questionGroup.name
																						)
																					}
																					moveUp={() => {
																						if (i > 0)
																							moveQuestion(
																								questionGroup.name,
																								q!.uid,
																								true
																							);
																					}}
																					moveDown={() => {
																						if (
																							i <
																							questionGroup.questions
																								.length -
																								1
																						)
																							moveQuestion(
																								questionGroup.name,
																								q!.uid,
																								false
																							);
																					}}
																					changeGroup={() => {
																						setChangeGroup({
																							qId: q!.uid,
																							currentGroup:
																								questionGroup.name,
																						});
																					}}
																					currentUserUid={localUser
																						.map(u => u.user.uid)
																						.orElse(toId(""))}
																					disabled={disableForStudent}
																				/>
																			);
																		})}
																</div>
															</Accordion.Body>
														</Accordion.Item>
													);
												})}
											</Accordion>
											<Button
												className="m-2"
												style={{ width: "12rem" }}
												onClick={() => setCurrentGroup({ showNameModal: true, name: "" })}
												disabled={disableForStudent}
											>
												Gruppe hinzufügen
											</Button>
											<Button
												className="m-2"
												style={{ width: "12rem" }}
												onClick={() => {
													nav("/Dashboard/Question");
												}}
												disabled={disableForStudent && !quizData.quiz.studentQuestions}
											>
												Neue Frage
											</Button>
										</div>
									</div>
								</Row>
								{/* <Row>
							<div className="d-flex flex-column flex-grow-1">
								<div data-color-mode="light">
									<MDEditor
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
										extraCommands={[]}
										value={value}
										onChange={setValue}
										height="100%"
										components={{ preview: (_source, _state, _dispath) => <></> }}
										preview="edit"
									/>
								</div>
								<div className="p-2 text-start h-30" dangerouslySetInnerHTML={{ __html: rendered }} />
							</div>
						</Row> */}
							</Tab>
							<Tab eventKey="statistics" title={i18n._("quiz-tab-label-statistics")}>
								Statistiken
							</Tab>
						</Tabs>
					</Container>
				);
			},
			() => null
		);

	/*const addComment = () => {
		localUser.forEach(lu => {
			const c: Omit<Comment, "authorId" | "authorName" | "uid"> = {
				text: value ?? "",
				created: toTimestamp(),
				updated: toTimestamp(),
				upvoters: [],
				answered: false,
				relatedQuiz: quiz.map(q => q.quiz.uid).orElse(toId("")),
			};
			console.log("QA", quizActor);
			quizActor.forEach(q => q.send(q, new AddComment(c)));
		});
	};*/
};
