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
import { useSearchParams } from "react-router-dom";
import { maybe } from "tsmonads";
import { Trans } from "@lingui/react";
import { add } from "rambda";

export const QuestionEdit: React.FC = () => {
	const [state, setState] = useState<"STARTED" | "ANSWERED" | "FINISHED">("STARTED");
	const quizId = useSearchParams()[0].get("q");
	const [localUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [quiz, quizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[] }>("CurrentQuiz");
	useEffect(() => {
		quizActor.forEach(q => {
			localUser.forEach(lu => {
				q.send(q, CurrentQuizMessages.SetUser(lu.user));
				q.send(q, CurrentQuizMessages.SetQuiz(toId("demo-quiz")));
			});
		});
	}, [quizId, quizActor.hasValue]);

	const [value, setValue] = useState<
		string | undefined
	>(`Ergeben die folgenden mathematischen Formeln wie $a+b^2$ **irgendeinen** Sinn?

${"```"}math
a = c^2 \\sum X \\int xdx  
${"```"}`);
	const [rendered, setRendered] = useState<string>("");
	const [show, setShow] = useState(false);

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

	useEffect(() => {
		const f = async () => {
			const result = await unified()
				.use(remarkParse)
				.use(remarkMath)
				.use(remarkRehype)
				.use(rehypeKatex)
				.use(rehypeStringify)
				.process(value);
			setRendered(result.toString());
		};
		f();
	}, [value]);
	return (
		<Container fluid>
			<div
				className="d-flex flew-row flex-nowrap align-items-center mb-2"
				style={{ marginLeft: "-0.5rem", marginRight: "-0.5rem" }}
			>
				<Breadcrumb>
					<Breadcrumb.Item href="/Dashboard">Dashboard</Breadcrumb.Item>
					<Breadcrumb.Item>{quiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}</Breadcrumb.Item>
					<Breadcrumb.Item>Frage 14</Breadcrumb.Item>
				</Breadcrumb>
			</div>
			<Row>
				<div className="d-flex flex-column h-100 w-100">
					<div className="flex-grow-1">
						<Container>
							<Card className="p-0">
								<Card.Header className="text-start d-flex flex-row">
									<div className="align-self-center">
										<strong>Frage 14.</strong>
									</div>
									<div className="flex-grow-1"></div>
									<div className="align-self-center">
										<Form.Select>
											<option>Einzelauswahl</option>
											<option>Mehrfachauswahl</option>
											<option>Freitext</option>
										</Form.Select>
									</div>
									<div className="m-1">
										<Button variant="light" disabled>
											<Check />
										</Button>
										&nbsp;
										<Button variant="primary">
											<Pencil />
										</Button>
										&nbsp;
										<Button variant="secondary">
											<PersonRaisedHand />
										</Button>
									</div>
								</Card.Header>
								<Card.Body>
									<div
										className="p-2 text-start h-30"
										dangerouslySetInnerHTML={{ __html: rendered }}
									/>
									<div className="mb-2">Hinweistext:</div>
									<InputGroup className="mb-2">
										<Form.Check
											className="align-self-center"
											label=""
											name="answer"
											type="switch"
											checked
										/>
										<InputGroup.Text className="flex-grow-1">
											Die Antwort ist nicht 42!
										</InputGroup.Text>
										<Button>
											<Pencil />
										</Button>
									</InputGroup>
								</Card.Body>
								<Card.Footer>
									Aktiviere alle <em>richtigen</em> Antworten
									<Form className="text-start mb-2 mt-2">
										<InputGroup className="mb-2">
											<Form.Check
												className="align-self-center"
												label=""
												name="answer"
												type="switch"
											/>
											<InputGroup.Text className="flex-grow-1">
												Ja, ich denke schon
											</InputGroup.Text>
											<Button>
												<Pencil />
											</Button>
											<Button variant="danger">
												<DashLg />
											</Button>
										</InputGroup>
										<InputGroup className="mb-2">
											<Form.Check
												className="align-self-center"
												label=""
												name="answer"
												type="switch"
											/>
											<InputGroup.Text className="flex-grow-1">
												Nein, ich denke nicht
											</InputGroup.Text>
											<Button>
												<Pencil />
											</Button>
											<Button variant="danger">
												<DashLg />
											</Button>
										</InputGroup>
										<InputGroup className="mb-2">
											<Form.Check
												className="align-self-center"
												label=""
												name="answer"
												type="switch"
											/>
											<InputGroup.Text className="flex-grow-1">Kommt drauf an</InputGroup.Text>
											<Button>
												<Pencil />
											</Button>
											<Button variant="danger">
												<DashLg />
											</Button>
										</InputGroup>
									</Form>
									<Button>Antwort hinzufügen</Button>
								</Card.Footer>
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
					{quiz
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
		</Container>
	);
};
