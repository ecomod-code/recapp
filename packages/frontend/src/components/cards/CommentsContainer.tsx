import { PropsWithChildren } from "react";
import Button from "react-bootstrap/Button";
import { Plus } from "react-bootstrap-icons";
import { Trans } from "@lingui/react";
import { useStatefulActor } from "ts-actors-react";
import { maybe, nothing } from "tsmonads";
import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { keys } from "rambda";

type Props = {
    showCommentArea: boolean;
    onClickAddComment: () => void;
} & PropsWithChildren;

export const CommentsContainer = (props: Props) => {
    const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");

    if (!props.showCommentArea) {
        return null;
    }

    const isCommentSectionVisible = mbQuiz
        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
        .match(
            x => x.isCommentSectionVisible,
            () => null
        );

    const setIsCommentSectionVisible = (value: boolean) => {
        tryQuizActor.forEach(actor => actor.send(actor, CurrentQuizMessages.setIsCommentSectionVisible(value)));
    };

    return (
        <>
            <div className="d-flex flex-column">
                <Button
                    className="flex-fillx align-self-end"
                    onClick={() => setIsCommentSectionVisible(!isCommentSectionVisible)}
                >
                    <Trans id="comments-container.toggle-button.label" />
                </Button>
            </div>
            {isCommentSectionVisible ? (
                <div
                    className="d-flex align-items-center border"
                    style={{
                        maxHeight: "19rem",
                        // height: "19rem",
                        overflowY: "hidden",
                        overflowX: "auto",
                        backgroundColor: "#f5f5f5",
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
            ) : null}
        </>
    );
};
