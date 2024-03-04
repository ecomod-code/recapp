import React from "react";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { AddComment, SetQuiz, SetUser } from "./actors/CurrentQuizActor";
import { Quiz, User, toId, Comment } from "@recapp/models";
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
} from "react-bootstrap";
import { ChatFill, Check, Pencil, Share, SignStop, Stop } from "react-bootstrap-icons";
import { CommentCard } from "./components/cards/CommentCard";
import { useNavigate, useNavigation } from "react-router-dom";

const QuizCard: React.FC = () => {
	const nav = useNavigate();
	return (
		<Card className="m-2 p-0">
			<Card.Title className="text-start ms-2 mt-2">Quiztitel</Card.Title>
			<Card.Body>
				<div className="d-flex">
					<div>100 Teilnehmende&nbsp;</div>
					<div className="flex-grow-1" />
					<Badge as="div" bg="success">
						Running
					</Badge>
				</div>
			</Card.Body>
			<Card.Footer>
				<div className="d-flex flex-row justify-content-end">
					<Button variant="primary" onClick={() => nav("/Dashboard/quiz?q=demo-quiz")}>
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
	return (
		<Container fluid>
			<Container fluid style={{ maxHeight: "70vh", overflowY: "auto" }}>
				<QuizCard />
				<QuizCard />
				<QuizCard />
				<QuizCard />
				<QuizCard />
				<QuizCard />
			</Container>
			<Button>
				<Trans id="button-new-quiz" />
			</Button>
		</Container>
	);
};
