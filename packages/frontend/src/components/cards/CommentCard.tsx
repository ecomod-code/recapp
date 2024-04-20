import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";

import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useRendered } from "../../hooks/useRendered";
import { Calendar2Check, HandThumbsUp, Question, Trash } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { fromTimestamp } from "itu-utils";
import { Comment, Id } from "@recapp/models";

const CARD_BODY_HEIGHT = 140;

interface Props {
    comment: Comment;
    userId: Id;
    teachers: string[];
    questionText?: string;
    onUpvote: () => void;
    onAccept: () => void;
    onDelete: () => void;
    onJumpToQuestion: () => void;
}

export const CommentCard: React.FC<Props> = props => {
    const [showInModal, setShowInModal] = useState(false);
    const showInModalHandler = (value: boolean) => {
        setShowInModal(value);
    };

    return (
        <>
            {showInModal ? (
                <Modal show={showInModal} size="lg">
                    <CommentCardContent {...props} isDisplayedInModal showInModalHandler={showInModalHandler} />
                </Modal>
            ) : null}

            <CommentCardContent {...props} showInModalHandler={showInModalHandler} />
        </>
    );
};

export const CommentCardContent: React.FC<
    Props & { isDisplayedInModal?: boolean; showInModalHandler: (value: boolean) => void }
> = ({
    comment,
    onUpvote,
    onAccept,
    onDelete,
    teachers,
    userId,
    questionText,
    onJumpToQuestion,
    showInModalHandler,
    isDisplayedInModal,
}) => {
    const { rendered } = useRendered({ value: comment.text });

    return (
        <Card
            className={`${isDisplayedInModal ? "p-0 m-0" : "p-0 m-1 mt-2 mb-3"}`}
            style={{ minWidth: "18rem" }}
            key={comment.uid}
        >
            <Card.Title className="p-1 ps-2 text-bg-light text-start">
                <div className="d-flex flex-row align-items-center">
                    <div className="flex-grow-1 fs-6">
                        {fromTimestamp(comment.updated).toLocaleString({
                            dateStyle: "medium",
                            timeStyle: "medium",
                        })}
                    </div>
                    <div>
                        <ButtonWithTooltip
                            titlePlacement={isDisplayedInModal ? "left" : undefined}
                            title={i18n._("comment-card.button-tooltip.upvote")}
                            variant="primary"
                            onClick={onUpvote}
                            className="p-2 d-flex"
                        >
                            <HandThumbsUp size={20} />
                            <span className="ms-2">{comment.upvoters.length}</span>
                        </ButtonWithTooltip>
                    </div>

                    {isDisplayedInModal ? (
                        <Button
                            variant="outline-secondary"
                            className="py-2 ms-2"
                            onClick={() => showInModalHandler(false)}
                        >
                            <Trans id="close" />
                        </Button>
                    ) : null}
                </div>
            </Card.Title>

            {!rendered ? <Card.Body style={{ minHeight: CARD_BODY_HEIGHT, overflow: "hidden" }} /> : null}

            {rendered ? (
                <SeeMoreContainer isDisplayedInModal={isDisplayedInModal} onClick={() => showInModalHandler(true)}>
                    <div key={new Date().getTime()} dangerouslySetInnerHTML={{ __html: rendered }} />
                </SeeMoreContainer>
            ) : null}

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
                            <Calendar2Check size={18} />
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

const SeeMoreContainer = (props: { isDisplayedInModal?: boolean; onClick?: () => void } & PropsWithChildren) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSeeMoreVisible, setIsSeeMoreVisible] = useState(false);

    useEffect(() => {
        if (containerRef.current && !props.isDisplayedInModal) {
            const contentHeight = containerRef.current.scrollHeight;
            const hasScroll = contentHeight > CARD_BODY_HEIGHT;
            if (hasScroll) {
                setIsSeeMoreVisible(true);
            }
        }
    }, []);

    return (
        <Card.Body ref={containerRef} style={{ minHeight: CARD_BODY_HEIGHT, overflow: "hidden", position: "relative" }}>
            <Card.Text as="div" className={`text-start ${isSeeMoreVisible ? "cutoff-text" : ""}`}>
                {props.children}
            </Card.Text>

            {isSeeMoreVisible ? (
                <Button
                    variant="link"
                    className="p-0"
                    style={{ lineHeight: 1.4, position: "absolute", bottom: 6, left: 16 }}
                    onClick={props.onClick}
                >
                    <Trans id="see-more-container.button-label" />
                </Button>
            ) : null}
        </Card.Body>
    );
};
