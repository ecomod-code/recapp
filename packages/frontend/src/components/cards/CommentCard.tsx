import { useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import Card from "react-bootstrap/Card";
import { Check, HandThumbsUp, Question, Trash } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { fromTimestamp } from "itu-utils";
import { Comment, Id } from "@recapp/models";

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
                        <ButtonWithTooltip
                            title={i18n._("comment-card.button-tooltip.upvote")}
                            variant="primary"
                            onClick={onUpvote}
                            className="p-2 d-flex"
                        >
                            <HandThumbsUp size={20} />
                            <span className="ms-2">{comment.upvoters.length}</span>
                        </ButtonWithTooltip>
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
                            <ButtonWithTooltip
                                title={questionText ?? ""}
                                variant="secondary"
                                className="m-1"
                                onClick={onJumpToQuestion}
                            >
                                <Question color="white" />
                            </ButtonWithTooltip>
                        )}
                        <ButtonWithTooltip
                            title={i18n._("comment-card.button-tooltip.accept")}
                            variant={comment.answered ? "secondary" : "success"}
                            className="m-1"
                            onClick={onAccept}
                            disabled={!teachers.includes(userId)}
                        >
                            <Check />
                        </ButtonWithTooltip>
                        <ButtonWithTooltip
                            title={i18n._("comment-card.button-tooltip.delete")}
                            variant="danger"
                            className="m-1"
                            onClick={onDelete}
                            disabled={comment.authorId !== userId && !teachers.includes(userId)}
                        >
                            <Trash />
                        </ButtonWithTooltip>
                    </div>
                </div>
            </Card.Footer>
        </Card>
    );
};
