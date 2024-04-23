import { PropsWithChildren } from "react";
import Button from "react-bootstrap/Button";
import Collapse from "react-bootstrap/Collapse";
import { ChevronDown, ChevronUp, Plus } from "react-bootstrap-icons";
import { Trans } from "@lingui/react";

type Props = {
    showCommentArea: boolean;
    onClickAddComment: () => void;
    onClickToggleButton: () => void;
    isCommentSectionVisible: boolean;
} & PropsWithChildren;

export const CommentsContainer = (props: Props) => {
    if (!props.showCommentArea) {
        return null;
    }

    return (
        <div className="d-flex flex-column">
            <Button
                className="align-self-end d-flex justify-content-center align-items-center col-12 col-lg-auto"
                onClick={props.onClickToggleButton}
                aria-controls="example-collapse-text"
                aria-expanded={props.isCommentSectionVisible}
            >
                {props.isCommentSectionVisible ? (
                    <ChevronUp className="me-2" size={20} />
                ) : (
                    <ChevronDown className="me-2" size={20} />
                )}
                <Trans id="comments-container.toggle-button.label" />
            </Button>

            <Collapse in={props.isCommentSectionVisible}>
                <div id="example-collapse-text">
                    <div
                        className="d-flex align-items-center border background-grey"
                        style={{
                            maxHeight: "19rem",
                            height: "19rem",
                            overflowY: "hidden",
                            overflowX: "auto",
                            minHeight: "18rem",
                        }}
                    >
                        <div className="d-flex flex-column justify-content-center align-items-center p-4">
                            <Button variant="secondary" onClick={props.onClickAddComment}>
                                <Plus size={100} />
                            </Button>
                            <span style={{ width: 140, fontSize: "1.2rem", textAlign: "center" }}>
                                <Trans id="comment-row-new-comment-button" />
                            </span>
                        </div>

                        {props.children}
                    </div>
                </div>
            </Collapse>
        </div>
    );
};
