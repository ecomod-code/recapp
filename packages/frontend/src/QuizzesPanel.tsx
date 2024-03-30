import React, { useEffect, useState } from "react";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, Id, QuestionGroup } from "@recapp/models";
import { Badge, Button, Card, Container } from "react-bootstrap";
import { Pencil, Share, SignStop } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import { ShareModal } from "./components/modals/ShareModal";
import { fromTimestamp } from "itu-utils";

const getNumberOfQuestions = (groups: Array<QuestionGroup>): number =>
	groups.reduce((count, group) => count + (group?.questions?.length ?? 0), 0);

const QuizCard: React.FC<{ quiz: Partial<Quiz>; onShare: () => void }> = ({ quiz, onShare }) => {
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
					<Badge as="div" bg="success">
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
					<Button className="ms-3" variant="danger">
						<SignStop />
					</Button>
				</div>
			</Card.Footer>
		</Card>
	);
};

export const Quizzes: React.FC = () => {
	const nav = useNavigate();
	const [shareModal, setShareModal] = useState("");
	const [quizzes, setQuizzes] = useState<Array<Partial<Quiz>>>();
	const [state] = useStatefulActor<{ user: User | undefined; quizzes: Map<Id, Partial<Quiz>> }>("LocalUser");
	useEffect(() => {
		const q: Array<Partial<Quiz>> = state.map(s => Array.from(s.quizzes.values())).orElse([]);
		setQuizzes(
			q.toSorted((a, b) => {
				return b.updated?.value! - a.updated?.value!;
			})
		);
	}, [state]);

	return (
		<Container fluid>
			<ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />
			<Container fluid style={{ maxHeight: "70vh", overflowY: "auto" }}>
				{(quizzes ?? []).map(q => {
					return <QuizCard key={q.uid} quiz={q} onShare={() => setShareModal(q.uniqueLink!)} />;
				})}
			</Container>
			<Button onClick={() => nav({ pathname: "/Dashboard/CreateQuiz" })}>
				<Trans id="button-new-quiz" />
			</Button>
		</Container>
	);
};
