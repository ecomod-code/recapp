import { useEffect, useState } from "react";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { Comment, Id } from "@recapp/models";
import { Button, Card, Tooltip } from "react-bootstrap";
import { fromTimestamp } from "itu-utils";
import { Check, HandThumbsUp, Question, Trash } from "react-bootstrap-icons";
import { TooltipWrapper } from "../TooltipWrapper";
import { useNavigate } from "react-router-dom";

export const CommentCard: React.FC<{
	comment: Comment;
	userId: Id;
	teachers: string[];
	questionText?: string;
	onUpvote: () => void;
	onAccept: () => void;
	onDelete: () => void;
	onJumpToQuestion: () => void;
}> = ({ comment, onUpvote, onAccept, onDelete, teachers, userId, questionText, onJumpToQuestion }) => {
	const [text, setText] = useState("");
	const nav = useNavigate();
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
		<Card className="p-0 m-1" style={{ width: "18rem", minHeight: 250 }} key={comment.uid}>
			<Card.Title className="p-1 ps-2 text-bg-light text-start">
				<div className="d-flex flex-row align-items-center">
					<div className="flex-grow-1 fs-6">
						{fromTimestamp(comment.updated).toLocaleString({ dateStyle: "medium", timeStyle: "medium" })}
					</div>
					<div>
						<Button variant="primary" onClick={onUpvote}>
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
						{comment.relatedQuestion && questionText && (
							<TooltipWrapper title={questionText ?? ""}>
								<Button
									variant="secondary"
									className="m-1"
									onClick={onJumpToQuestion}
									disabled={!teachers.includes(userId)}
								>
									<Question color="white" />
								</Button>
							</TooltipWrapper>
						)}
						<Button
							variant={comment.answered ? "secondary" : "success"}
							className="m-1"
							onClick={onAccept}
							disabled={!teachers.includes(userId)}
						>
							<Check color="white" />
						</Button>
						<Button
							variant="danger"
							className="m-1"
							onClick={onDelete}
							disabled={comment.authorId !== userId && !teachers.includes(userId)}
						>
							<Trash color="white" />
						</Button>
					</div>
				</div>
			</Card.Footer>
		</Card>
	);
};
