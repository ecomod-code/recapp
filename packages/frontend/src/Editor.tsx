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
import { Offcanvas, Button, Card } from "react-bootstrap";
import { fromTimestamp, toTimestamp } from "itu-utils";
import { CheckCircleFill, CircleFill, Pencil, Check, HandThumbsUp, ChatFill } from "react-bootstrap-icons";

const CommentCard: React.FC<{ comment: Comment }> = ({ comment }) => {
	const [text, setText] = useState("");
	useEffect(() => {
		const f = async () => {
			const result = await unified()
				.use(remarkParse)
				.use(remarkMath)
				.use(remarkRehype)
				.use(rehypeKatex)
				.use(rehypeStringify)
				.process(comment.text);
			setText(result.toString());
		};
		f();
	}, [comment.text]);
	return (
		<Card className="p-0 m-1" style={{ width: "100%" }} key={comment.uid}>
			<Card.Title className="p-1 ps-2 text-bg-light text-start">
				<div className="d-flex flex-row align-items-center">
					<div className="flex-grow-1 fs-6">
						{fromTimestamp(comment.updated).toLocaleString({ dateStyle: "medium", timeStyle: "medium" })}
					</div>
					<div>
						<Button variant="primary">
							<HandThumbsUp color="white" className="pb-1 m-1" />
							&nbsp;{comment.upvoters.length}
						</Button>
					</div>
				</div>
			</Card.Title>
			<Card.Body>
				<Card.Text as="div" className="text-start">
					<div dangerouslySetInnerHTML={{ __html: text }} />
				</Card.Text>
			</Card.Body>
			<Card.Footer className="p-1 w-100 text-start">
				<div className="d-flex flex-row align-items-center">
					<div className="flex-grow-1 align-content-center ps-1">{comment.authorName}</div>
					<div>
						<Button variant="success" className="m-1">
							<Check color="white" />
						</Button>
					</div>
				</div>
			</Card.Footer>
		</Card>
	);
};

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
		<div className="d-flex flex-column w-100 h-100">
			<div style={{ position: "fixed", top: 16, right: 100, height: 32, zIndex: 1044 }}>
				<ChatFill color="black" onClick={handleShow} height={"1.5em"} width={"1.5em"} />
			</div>
			<div className="p-2 text-start" dangerouslySetInnerHTML={{ __html: rendered }} />
			<div className="w-100" data-color-mode="light">
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

			<Offcanvas show={show} onHide={handleClose} placement="end">
				<Offcanvas.Header closeButton>
					<Offcanvas.Title>Q&A</Offcanvas.Title>
				</Offcanvas.Header>
				<Offcanvas.Body>
					{quiz
						.map(q => q.comments)
						.map(c => c.map(cmt => <CommentCard comment={cmt} />))
						.orElse([<Fragment />])}
				</Offcanvas.Body>
			</Offcanvas>
		</div>
	);
};
