import React from "react";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, toId, Comment, Id } from "@recapp/models";
import { Badge, Button, Card, Container } from "react-bootstrap";
import { ChatFill, Check, Pencil, Share, SignStop, Stop } from "react-bootstrap-icons";
import { useNavigate, useNavigation } from "react-router-dom";

const QuizCard: React.FC<{ quiz: Partial<Quiz> }> = ({ quiz }) => {
	const nav = useNavigate();
	return (
		<Card className="m-2 p-0">
			<Card.Title className="text-start ms-2 mt-2">{quiz.title ?? ""}</Card.Title>
			<Card.Body>
				<div className="d-flex">
					<div>{quiz.students?.length ?? 0} Teilnehmende&nbsp;</div>
					<div className="flex-grow-1" />
					<Badge as="div" bg="success">
						{quiz.state}
					</Badge>
				</div>
			</Card.Body>
			<Card.Footer>
				<div className="d-flex flex-row justify-content-end">
					<Button variant="primary" onClick={() => nav(`/Dashboard/quiz?q=${quiz.uid ?? ""}`)}>
						<Pencil />
					</Button>
					<Button className="ms-3" variant="secondary">
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
	const [state] = useStatefulActor<{ user: User | undefined; quizzes: Map<Id, Partial<Quiz>> }>("LocalUser");
	const quizzes: Array<Partial<Quiz>> = state.map(s => Array.from(s.quizzes.values())).orElse([]);
	return (
		<Container fluid>
			<Container fluid style={{ maxHeight: "70vh", overflowY: "auto" }}>
				{quizzes.map(q => {
					return <QuizCard key={q.uid} quiz={q} />;
				})}
			</Container>
			<Button onClick={() => nav("/Dashboard/CreateQuiz")}>
				<Trans id="button-new-quiz" />
			</Button>
		</Container>
	);
};
