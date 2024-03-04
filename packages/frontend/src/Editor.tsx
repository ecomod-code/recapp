import MDEditor, { commands } from "@uiw/react-md-editor";
import { Fragment, useEffect, useState } from "react";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { useStatefulActor } from "ts-actors-react";
import { AddComment, SetQuiz, SetUser } from "./actors/CurrentQuizActor";
import { Quiz, User, toId, Comment } from "@recapp/models";
import { Offcanvas, Button, Card, Container, Row } from "react-bootstrap";
import { ChatFill } from "react-bootstrap-icons";
import { CommentCard } from "./components/cards/CommentCard";

export const Editor: React.FC<{ quizId: string }> = ({ quizId }) => {
	const [localUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [quiz, quizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[] }>("CurrentQuiz");
	useEffect(() => {
		quizActor.forEach(q => {
			localUser.forEach(lu => {
				q.send(q, new SetUser(lu.user));
				q.send(q, new SetQuiz(toId("demo-quiz")));
			});
		});
	}, [quizId, quizActor.hasValue]);

	console.log("QUIZ", quiz);

	const [value, setValue] = useState<string | undefined>(`Hallo $a+b^2$

${"```"}math
a = c^2 \\sum X \\int xdx  
${"```"}`);
	const [rendered, setRendered] = useState<string>("");
	const [show, setShow] = useState(false);

	const handleClose = () => setShow(false);
	const handleShow = () => setShow(true);

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
			<Row>
				<div className="d-flex flex-row h-100">
					<div
						className="d-none d-xs-block d-sm-block d-md-block d-lg-none"
						style={{ position: "fixed", top: 16, right: 100, height: 32, zIndex: 1044 }}
					>
						<ChatFill color="black" onClick={handleShow} height={"1.5em"} width={"1.5em"} />
					</div>
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
					<div
						className="d-xs-none d-sm-none d-md-none d-lg-block"
						style={{ width: "19rem", maxHeight: "70vh", overflowY: "auto", overflowX: "hidden" }}
					>
						{quiz
							.map(q => q.comments)
							.map(c => c.map(cmt => <CommentCard key={cmt.uid} comment={cmt} />))
							.orElse([<Fragment />])}
					</div>
				</div>
			</Row>
			<Offcanvas
				className="d-none d-xs-block d-sm-block d-md-block d-lg-none"
				show={show}
				onHide={handleClose}
				placement="end"
			>
				<Offcanvas.Header closeButton>
					<Offcanvas.Title>Q&A</Offcanvas.Title>
				</Offcanvas.Header>
				<Offcanvas.Body>
					{quiz
						.map(q => q.comments)
						.map(c => c.map(cmt => <CommentCard key={cmt.uid} comment={cmt} />))
						.orElse([<Fragment />])}
				</Offcanvas.Body>
			</Offcanvas>
		</Container>
	);
};
