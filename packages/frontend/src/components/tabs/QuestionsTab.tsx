import { Id, Question, QuestionGroup, Quiz, User, toId } from "@recapp/models";
import { Accordion, Button, Row } from "react-bootstrap";
import { ArrowDown, ArrowUp, Pencil } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { useStatefulActor } from "ts-actors-react";
import { YesNoModal } from "../modals/YesNoModal";
import { ShareModal } from "../modals/ShareModal";
import { useState } from "react";
import { Maybe } from "tsmonads";
import { ChangeGroupModal } from "../modals/ChangeGroupModal";
import { CreateGroupModal } from "../modals/CreateGroupModal";
import { QuestionCard } from "../cards/QuestionCard";

export const QuestionsTab: React.FC<{
	quizData: CurrentQuizState;
	localUser: Maybe<User>;
	disableForStudent: boolean;
}> = ({ quizData, disableForStudent, localUser }) => {
	const nav = useNavigate();
	const [shareModal, setShareModal] = useState("");
	const [deleteModal, setDeleteModal] = useState(toId(""));
	const [mbQuiz, tryQuizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[]; questions: Question[] }>(
		"CurrentQuiz"
	);
	const disableForStudentOrMode = disableForStudent || quizData.quiz.state !== "EDITING";

	const [currentGroup, setCurrentGroup] = useState({
		showNameModal: false,
		name: "",
	});
	const [changeGroup, setChangeGroup] = useState({
		qId: "",
		currentGroup: "",
	});

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
		tryQuizActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update({ groups: quizData.quiz.groups })));
	};

	const approveQuestion = (uid: Id, approved: boolean) => {
		tryQuizActor.forEach(a =>
			a.send(a.name, CurrentQuizMessages.UpdateQuestion({ question: { uid, approved: !approved }, group: "" }))
		);
	};

	const editQuestion = (uid: Id, group: string) => {
		nav({ pathname: "/Dashboard/Question" }, { state: { quizId: uid, group } });
	};

	const deleteQuestion = () => {
		tryQuizActor.forEach(q => q.send(q, CurrentQuizMessages.DeleteQuestion(deleteModal)));
		setDeleteModal(toId(""));
	};

	const teachers: string[] = quizData.quiz.teachers ?? [];
	const unfilteredQuestions: Question[] = mbQuiz.map(q => q.questions).orElse([]);
	const questions = unfilteredQuestions.filter(q => {
		const user: Id = localUser.map(l => l.uid).orElse(toId(""));
		if (localUser.map(l => l.role).orElse("STUDENT") === "ADMIN") {
			return true;
		}
		if (q.approved) return true;
		if (q.authorId === user) return true;
		if (teachers.includes(user)) return true;
		return false;
	});

	return (
		<Row>
			<ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />
			<YesNoModal
				show={!!deleteModal}
				titleId="delete-question-title"
				textId="delete-question-text"
				onClose={() => setDeleteModal(toId(""))}
				onSubmit={deleteQuestion}
			/>
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
			<div className="d-flex flex-column h-100 w-100">
				<div className="d-flex flex-row mb-4">
					<div>
						{quizData.questions.length} Fragen, {quizData.quiz.students.length} Studierende
					</div>
					<div className="flex-grow-1">&nbsp;</div>
					<div>
						<Button onClick={() => setShareModal(quizData.quiz.uniqueLink)}>QR-Code anzeigen</Button>
					</div>
				</div>

				<div className="flex-grow-1">
					<Accordion defaultActiveKey="0">
						{quizData.quiz.groups.map((questionGroup, index) => {
							return (
								<Accordion.Item key={questionGroup.name} eventKey={questionGroup.name}>
									<Accordion.Header as={"div"}>
										<div className="d-flex w-100 align-items-center" style={{ margin: "-0.5rem" }}>
											<div className="d-flex flex-column h-100 me-1">
												<div>
													<Button
														as="div"
														variant="light"
														className={disableForStudentOrMode ? "disabled" : undefined}
														size="sm"
														onClick={() =>
															index !== 0 &&
															!disableForStudentOrMode &&
															moveGroup(questionGroup.name, true)
														}
													>
														<ArrowUp />
													</Button>
												</div>
												<div>&nbsp;</div>
												<div>
													<Button
														as="div"
														variant="light"
														className={disableForStudentOrMode ? "disabled" : undefined}
														size="sm"
														onClick={() =>
															index !== quizData.quiz.groups.length - 1 &&
															!disableForStudentOrMode &&
															moveGroup(questionGroup.name, false)
														}
													>
														<ArrowDown />
													</Button>
												</div>
											</div>
											<div className="flex-grow-1">
												<strong>{questionGroup.name} </strong>
											</div>
											<div>{questionGroup.questions?.length ?? 0} Frage(n)&nbsp;&nbsp;</div>
											<Button
												as="div"
												className={"me-4 " + (disableForStudentOrMode ? "disabled" : "")}
												onClick={() =>
													!disableForStudentOrMode &&
													setCurrentGroup({
														showNameModal: true,
														name: questionGroup.name,
													})
												}
											>
												<Pencil />
											</Button>
											<div style={{ width: 32 }}></div>
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
															editMode={quizData.quiz.state === "EDITING"}
															question={q!}
															key={q!.uid}
															approve={() => approveQuestion(q!.uid, q!.approved)}
															delete={() => setDeleteModal(q!.uid)}
															edit={() => editQuestion(q!.uid, questionGroup.name)}
															moveUp={() => {
																if (i > 0)
																	moveQuestion(questionGroup.name, q!.uid, true);
															}}
															moveDown={() => {
																if (i < questionGroup.questions.length - 1)
																	moveQuestion(questionGroup.name, q!.uid, false);
															}}
															changeGroup={() => {
																if (quizData.quiz.groups.length < 2) {
																	return;
																}
																setChangeGroup({
																	qId: q!.uid,
																	currentGroup: questionGroup.name,
																});
															}}
															currentUserUid={localUser.map(u => u.uid).orElse(toId(""))}
															disabled={disableForStudentOrMode}
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
						disabled={disableForStudentOrMode}
					>
						Gruppe hinzufügen
					</Button>
					<Button
						className="m-2"
						style={{ width: "12rem" }}
						onClick={() => {
							nav({ pathname: "/Dashboard/Question" });
						}}
						disabled={
							(disableForStudentOrMode && !quizData.quiz.studentQuestions) ||
							quizData.quiz.state !== "EDITING"
						}
					>
						Neue Frage
					</Button>
				</div>
			</div>
		</Row>
	);
};
