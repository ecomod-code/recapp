import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";

import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useRendered } from "../../hooks/useRendered";
import { Calendar2Check, HandThumbsUp, Question, Trash } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { Comment, Id } from "@recapp/models";

const MAX_LINES = 4;
const EM = 16;
const LINE_HEIGHT = 1.4;
const CUTOFF_CONTAINER_HEIGHT = MAX_LINES * EM * LINE_HEIGHT;

interface Props {
    comment: Comment;
    userId: Id;
    teachers: string[];
    questionText?: string;
    onUpvote: () => void;
    onAccept: () => void;
    onDelete: () => void;
    onJumpToQuestion: () => void;
    isCommentSectionVisible: boolean;
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
    isCommentSectionVisible,
}) => {
    const { rendered } = useRendered({ value: comment.text });

    const isQuizTeacher = teachers.includes(userId);

    return (
        <Card
            className={`${isDisplayedInModal ? "p-0 m-0" : "p-0 m-1 mt-2 mb-3"} overflow-hidden`}
            style={{ minWidth: "18rem" }}
            key={comment.uid}
        >
            <Card.Title className="p-1 ps-2 text-bg-light text-start">
                <div className="py-2 d-flex flex-row align-items-center">
                    <div className="flex-grow-1 align-content-center ps-1 text-overflow-ellipsis">
                        {comment.authorName}
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

            {!rendered ? <Card.Body style={{ minHeight: CUTOFF_CONTAINER_HEIGHT, overflow: "hidden" }} /> : null}

            {rendered ? (
                <SeeMoreContainer
                    isCommentSectionVisible={isCommentSectionVisible}
                    isDisplayedInModal={isDisplayedInModal}
                    onClick={() => showInModalHandler(true)}
                >
                    <div key={new Date().getTime()} dangerouslySetInnerHTML={{ __html: rendered }} />
                </SeeMoreContainer>
            ) : null}

            <Card.Footer className="p-1 w-100 text-start">
                <div className="d-flex align-items-between justify-content-between">
                    <ButtonWithTooltip
                        title={i18n._("comment-card.button-tooltip.upvote")}
                        variant="primary"
                        onClick={onUpvote}
                        className="px-2 m-1 d-flex"
                    >
                        <HandThumbsUp size={20} />
                        <span className="ms-2">{comment.upvoters.length}</span>
                    </ButtonWithTooltip>

                    <div className="d-flex">
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

                        {isQuizTeacher ? (
                            <ButtonWithTooltip
                                title={i18n._("comment-card.button-tooltip.accept")}
                                variant={comment.answered ? "secondary" : "success"}
                                className="m-1"
                                onClick={onAccept}
                                disabled={!isQuizTeacher}
                            >
                                <Calendar2Check size={18} />
                            </ButtonWithTooltip>
                        ) : null}

                        {comment.authorId === userId || isQuizTeacher ? (
                            <ButtonWithTooltip
                                title={i18n._("comment-card.button-tooltip.delete")}
                                variant="danger"
                                className="m-1"
                                onClick={onDelete}
                                disabled={comment.authorId !== userId && !isQuizTeacher}
                            >
                                <Trash />
                            </ButtonWithTooltip>
                        ) : null}
                    </div>
                </div>
            </Card.Footer>
        </Card>
    );
};

export const SeeMoreContainer = (
    props: { isDisplayedInModal?: boolean; onClick?: () => void; isCommentSectionVisible: boolean } & PropsWithChildren
) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSeeMoreVisible, setIsSeeMoreVisible] = useState(false);

    useEffect(() => {
        if (!props.isCommentSectionVisible) {
            return;
        }

        setTimeout(() => {
            if (containerRef.current && !props.isDisplayedInModal) {
                const contentHeight = containerRef.current.scrollHeight;
                const hasScroll = contentHeight > CUTOFF_CONTAINER_HEIGHT + EM;
                if (hasScroll) {
                    setIsSeeMoreVisible(true);
                }

                containerRef.current.style.setProperty("--cutoff-container-height", `${CUTOFF_CONTAINER_HEIGHT}px`);
                containerRef.current.style.setProperty("--line-height", `${LINE_HEIGHT}`);
                containerRef.current.style.setProperty("--max-lines", `${MAX_LINES}`);
            }
        }, 10);
    }, [props.isCommentSectionVisible]);

    return (
        <Card.Body className="position-relative">
            <div
                ref={containerRef}
                className={`text-start mb-3 content-space-resetter ${isSeeMoreVisible ? "cutoff-text" : ""}`}
                style={{ minHeight: CUTOFF_CONTAINER_HEIGHT, lineHeight: LINE_HEIGHT }}
            >
                {props.children}
            </div>

            {isSeeMoreVisible ? (
                <Button
                    variant="link"
                    className="p-0"
                    style={{
                        lineHeight: LINE_HEIGHT,
                        position: "absolute",
                        left: 16,
                        bottom: 6,
                    }}
                    onClick={props.onClick}
                >
                    <Trans id="see-more-container.button-label" />
                </Button>
            ) : null}
        </Card.Body>
    );
};
