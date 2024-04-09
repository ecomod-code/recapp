import React from "react";
import { useNavigate } from "react-router-dom";
import { Quiz, QuestionGroup } from "@recapp/models";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import { Pencil, Share, Trash } from "react-bootstrap-icons";
import { fromTimestamp } from "itu-utils";

const getNumberOfQuestions = (groups: Array<QuestionGroup>): number =>
    groups.reduce((count, group) => count + (group?.questions?.length ?? 0), 0);

const getBG = (state: "EDITING" | "STOPPED" | "STARTED" | "ACTIVE"): string => {
    switch (state) {
        case "EDITING":
            return "primary";
        case "STARTED":
            return "success";
        case "STOPPED":
            return "warning";
        default:
            return "secondary";
    }
};

export const QuizCard: React.FC<{ quiz: Partial<Quiz>; onShare: () => void; onDelete?: () => void }> = ({
    quiz,
    onShare,
    onDelete,
}) => {
    const nav = useNavigate();
    return (
        <div className="m-2 mb-4 p-0">
            <div style={{ fontSize: 12, color: "grey" }}>
                Letzte Änderung&nbsp;
                {fromTimestamp(quiz.updated ?? -1).toLocaleString({ dateStyle: "medium", timeStyle: "medium" })}
            </div>
            <Card>
                <Card.Title className="text-start mx-2 mt-3">{quiz.title ?? ""}</Card.Title>
                <Card.Body>
                    <div>
                        {quiz.students?.length ?? 0} Teilnehmende&nbsp;{getNumberOfQuestions(quiz.groups ?? [])}{" "}
                        Fragen&nbsp;
                    </div>

                    <Badge as="div" className="mt-2" bg={getBG(quiz.state ?? "ACTIVE")}>
                        {quiz.state}
                    </Badge>
                </Card.Body>
                <Card.Footer>
                    <div className="d-flex flex-row justify-content-end">
                        <Button
                            variant="primary"
                            onClick={() => nav({ pathname: "/Dashboard/quiz" }, { state: { quizId: quiz.uid } })}
                        >
                            <Pencil />
                        </Button>
                        <Button className="ms-2" variant="secondary" onClick={onShare}>
                            <Share />
                        </Button>
                        <Button className="ms-2" variant="danger" onClick={onDelete}>
                            <Trash />
                        </Button>
                    </div>
                </Card.Footer>
            </Card>
        </div>
    );
};
