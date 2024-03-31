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
} from "react-bootstrap";
import { ArrowDown, ArrowUp, ChatFill, Check, Pencil, PersonRaisedHand } from "react-bootstrap-icons";
import { CurrentQuizMessages } from "../actors/CurrentQuizActor";
import { CommentCard } from "../components/cards/CommentCard";
import { useSearchParams } from "react-router-dom";
import { maybe } from "tsmonads";
import { Trans } from "@lingui/react";
import { add } from "rambda";

export const RunningQuiz: React.FC = () => {
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
				<div className="mt-2">
					<h2>{quiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}</h2>
				</div>
				<div className="flex-grow-1"></div>
				<div>
					<Button variant="warning">Quiz abbrechen</Button>
				</div>
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
									<div className="m-1">
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
								</Card.Body>
								<Card.Footer>
									<Form className="text-start mb-2">
										<Form.Check label="Ja, ich denke schon" name="answer" type="radio" />
										<Form.Check label="Nein, ich denke nicht" name="answer" type="radio" />
										<Form.Check label="Kommt drauf an" name="answer" type="radio" />
										<Form.Check label="Kaffee ist alle" name="answer" type="radio" />
									</Form>
									{state === "STARTED" && (
										<Button onClick={() => setState("ANSWERED")}>Abschließen</Button>
									)}
									{state === "ANSWERED" && (
										<>
											<Alert variant="danger">Das ist leider falsch</Alert>&nbsp;
											<Button onClick={() => setState("STARTED")}>Nächste Frage</Button>
										</>
									)}
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
									<CommentCard
										userId={toId("")}
										teachers={[]}
										comment={cmt}
										onDelete={() => {}}
										onUpvote={() => {}}
										onAccept={() => {}}
									/>
								</div>
							))
						)
						.orElse([<Fragment />])}
				</div>
			</Row>
		</Container>
	);
};
