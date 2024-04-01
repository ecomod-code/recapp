import React, { useEffect, useRef, useState } from "react";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, Id, QuestionGroup, toId } from "@recapp/models";
import { Badge, Button, Card, Container } from "react-bootstrap";
import { Pencil, Share, SignStop, Trash } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { ShareModal } from "./components/modals/ShareModal";
import { fromTimestamp } from "itu-utils";
import { YesNoModal } from "./components/modals/YesNoModal";
import { ArchiveQuizMessage } from "./actors/LocalUserActor";

const getNumberOfQuestions = (groups: Array<QuestionGroup>): number =>
	groups.reduce((count, group) => count + (group?.questions?.length ?? 0), 0);

const getBG = (state: "EDITING" | "STOPPED" | "STARTED" | "ACTIVE"): string => {
	switch (state) {
		case "EDITING":
			return "primary";
		case "STARTED":
			return "success";
		case "STOPPED":
			return "warning";
		default:
			return "secondary";
	}
};

const QuizCard: React.FC<{ quiz: Partial<Quiz>; onShare: () => void; onDelete?: () => void }> = ({
	quiz,
	onShare,
	onDelete,
}) => {
	const nav = useNavigate();
	return (
		<Card className="m-2 p-0">
			<Card.Title className="text-start ms-2 mt-2">{quiz.title ?? ""}</Card.Title>
			<Card.Body>
				<div className="d-flex">
					<div>{quiz.students?.length ?? 0} Teilnehmende&nbsp;</div>
					<div>{getNumberOfQuestions(quiz.groups ?? [])} Fragen&nbsp;</div>
					<div className="flex-grow-1" />
					<div>
						(Letzte Änderung{" "}
						{fromTimestamp(quiz.updated ?? -1).toLocaleString({ dateStyle: "medium", timeStyle: "medium" })}
						)
					</div>
					<div className="flex-grow-1" />
					<Badge as="div" bg={getBG(quiz.state ?? "ACTIVE")}>
						{quiz.state}
					</Badge>
				</div>
			</Card.Body>
			<Card.Footer>
				<div className="d-flex flex-row justify-content-end">
					<Button
						variant="primary"
						onClick={() => nav({ pathname: "/Dashboard/quiz" }, { state: { quizId: quiz.uid } })}
					>
						<Pencil />
					</Button>
					<Button className="ms-3" variant="secondary" onClick={onShare}>
						<Share />
					</Button>
					<Button className="ms-3" variant="danger" onClick={onDelete}>
						<Trash />
					</Button>
				</div>
			</Card.Footer>
		</Card>
	);
};

export const Quizzes: React.FC = () => {
	const nav = useNavigate();
	const [shareModal, setShareModal] = useState("");
	const [deleteModal, setDeleteModal] = useState(toId(""));
	const [quizzes, setQuizzes] = useState<Array<Partial<Quiz>>>();
	const updateCounterRef = useRef<number>(0);
	const [state, tryLocalUserActor] = useStatefulActor<{
		user: User | undefined;
		quizzes: Map<Id, Partial<Quiz>>;
		updateCounter: number;
	}>("LocalUser");
	useEffect(() => {
		const counter = state.map(s => s.updateCounter).orElse(0);
		if (counter === updateCounterRef.current) {
			return;
		}
		updateCounterRef.current = counter;
		const q: Array<Partial<Quiz>> = state.map(s => Array.from(s.quizzes.values())).orElse([]);
		setQuizzes(
			q.toSorted((a, b) => {
				return b.updated?.value! - a.updated?.value!;
			})
		);
	}, [state]);

	const deleteAllowed = (quiz: Partial<Quiz>): true | undefined => {
		const isAdmin = state
			.map(s => s.user)
			.map(u => u?.role === "ADMIN")
			.orElse(false);
		const isTeacher = state
			.map(s => s.user)
			.map(u => (u?.uid && quiz.teachers?.includes(u?.uid)) ?? false)
			.orElse(false);
		return isAdmin || isTeacher ? true : undefined;
	};

	const deleteQuestion = () => {
		tryLocalUserActor.forEach(q => q.send(q, new ArchiveQuizMessage(deleteModal)));
		setDeleteModal(toId(""));
	};

	return (
		<Container fluid>
			<YesNoModal
				show={!!deleteModal}
				titleId="archive-quiz-title"
				textId="archive-quiz-text"
				onClose={() => setDeleteModal(toId(""))}
				onSubmit={deleteQuestion}
			/>
			<ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />
			<Container fluid style={{ maxHeight: "70vh", overflowY: "auto" }}>
				{(quizzes ?? []).map(q => {
					return (
						<QuizCard
							key={q.uid}
							quiz={q}
							onShare={() => setShareModal(q.uniqueLink!)}
							onDelete={deleteAllowed(q) && (() => setDeleteModal(q.uid!))}
						/>
					);
				})}
			</Container>
			<Button onClick={() => nav({ pathname: "/Dashboard/CreateQuiz" })}>
				<Trans id="button-new-quiz" />
			</Button>
		</Container>
	);
};
