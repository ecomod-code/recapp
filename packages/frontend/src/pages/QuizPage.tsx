import { Fragment, useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { useActorSystem, useStatefulActor } from "ts-actors-react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, toId, Comment, Id } from "@recapp/models";
import { Maybe, maybe, nothing } from "tsmonads";
import { keys } from "rambda";

import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Breadcrumb from "react-bootstrap/Breadcrumb";
import Tabs from "react-bootstrap/Tabs";
import Tab from "react-bootstrap/Tab";
import { CommentCard } from "../components/cards/CommentCard";
import { QuizDataTab } from "../components/quiz-tabs/QuizDataTab";
import { MarkdownModal } from "../components/modals/MarkdownModal";
import { QuestionsTab } from "../components/quiz-tabs/QuestionsTab";
import { RunningQuizTab } from "../components/quiz-tabs/RunningQuizTab";
import { QuizStatsTab } from "../components/quiz-tabs/QuizStatsTab";

import { actorUris } from "../actorUris";
import { CurrentQuizMessages, CurrentQuizState } from "../actors/CurrentQuizActor";
import { toTimestamp, debug } from "itu-utils";

const sortComments = (a: Comment, b: Comment) => {
    if (a.answered && !b.answered) return 1;
    if (!a.answered && b.answered) return -1;
    if (a.upvoters.length !== b.upvoters.length) return b.upvoters.length - a.upvoters.length;
    return b.updated.value - a.updated.value;
};

type TabValue = "quizData" | "questions" | "statistics";

const tabRecords: Record<TabValue, { label: string; value: TabValue }> = {
    quizData: {
        label: "quiz-tab-label-data",
        value: "quizData",
    },
    questions: {
        label: "quiz-tab-label-questions",
        value: "questions",
    },
    statistics: {
        label: "quiz-tab-label-statistics",
        value: "statistics",
    },
};

export const QuizPage: React.FC = () => {
    const nav = useNavigate();
    const [showMDModal, setShowMDModal] = useState(false);
    const { state } = useLocation();
    const quizId: Id = state.quizId;
    const activate = state.activate;
    const system = useActorSystem();
    const [mbLocalUser] = useStatefulActor<{ user: User }>("LocalUser");
    const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
    const [activeKey, setActiveKey] = useState<TabValue>("questions");

    useEffect(() => {
        if (!quizId) {
            return;
        }
        if (activate) {
            tryQuizActor.forEach(q => {
                mbLocalUser.forEach(lu => {
                    q.send(q, CurrentQuizMessages.Activate({ userId: lu.user.uid, quizId }));
                    q.send(q, CurrentQuizMessages.SetQuiz(toId(quizId)));
                });
            });
        }
        tryQuizActor.forEach(q => {
            mbLocalUser.forEach(lu => {
                q.send(q, CurrentQuizMessages.SetUser(lu.user));
                q.send(q, CurrentQuizMessages.SetQuiz(toId(quizId)));
            });
        });
    }, [quizId, tryQuizActor.hasValue]);

    const localUser: Maybe<User> = mbLocalUser.flatMap(u => (keys(u.user).length > 0 ? maybe(u.user) : nothing()));
    const teachers: string[] = mbQuiz.flatMap(q => maybe(q.quiz?.teachers)).orElse([]);
    const comments: Comment[] = mbQuiz.map(q => q.comments).orElse([]);

    const upvoteComment = (commentId: Id) => {
        tryQuizActor.forEach(actor => {
            actor.send(actor, CurrentQuizMessages.UpvoteComment(commentId));
        });
    };

    const finishComment = (commentId: Id) => {
        const user: Id = localUser.map(l => l.uid).orElse(toId(""));
        if (!teachers.includes(user)) {
            return;
        }
        tryQuizActor.forEach(actor => {
            actor.send(actor, CurrentQuizMessages.FinishComment(commentId));
        });
    };

    const deleteComment = (commentId: Id) => {
        tryQuizActor.forEach(actor => {
            actor.send(actor, CurrentQuizMessages.DeleteComment(commentId));
        });
    };

    return mbQuiz
        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
        .match(
            quizData => {
                const allowed = (user: User) => {
                    if (user.role === "STUDENT") {
                        return true;
                    }
                    if (user.role === "TEACHER" && !quizData.quiz.teachers.includes(user.uid)) {
                        return true;
                    }
                    return false;
                };

                const disableForStudent = localUser.map(allowed).orElse(true);

                const addComment = (value: string) => {
                    mbLocalUser.forEach(lu => {
                        const c: Omit<Comment, "authorId" | "authorName" | "uid"> = {
                            text: value,
                            created: toTimestamp(),
                            updated: toTimestamp(),
                            upvoters: [],
                            answered: false,
                            relatedQuiz: quizData.quiz.uid,
                        };
                        tryQuizActor.forEach(q => q.send(q, CurrentQuizMessages.AddComment(c)));
                    });
                    setShowMDModal(false);
                };

                const logQuestion = (questionId: Id, answer: string | boolean[]) => {
                    console.log("SYS", system, "URI", actorUris["CurrentQuiz"]);
                    tryQuizActor.forEach(actor =>
                        actor.send(actorUris["CurrentQuiz"], CurrentQuizMessages.LogAnswer({ questionId, answer }))
                    );
                };

                return (
                    <Container fluid>
                        <MarkdownModal
                            titleId="new-comment-title"
                            editorValue=""
                            show={showMDModal}
                            onClose={() => setShowMDModal(false)}
                            onSubmit={addComment}
                        />

                        <Row>
                            <Breadcrumb>
                                <Breadcrumb.Item onClick={() => nav({ pathname: "/Dashboard" })}>
                                    Dashboard
                                </Breadcrumb.Item>
                                <Breadcrumb.Item>
                                    {mbQuiz.flatMap(q => maybe(q.quiz?.title)).orElse("---")}
                                </Breadcrumb.Item>
                            </Breadcrumb>
                        </Row>
                        <Row>
                            <Tabs
                                // defaultActiveKey="questions"
                                className="mb-3 w-100"
                                activeKey={activeKey}
                                onSelect={k => setActiveKey(k as TabValue)}
                            >
                                {!disableForStudent && (
                                    <Tab eventKey={tabRecords.quizData.value} title={i18n._(tabRecords.quizData.label)}>
                                        <QuizDataTab />
                                    </Tab>
                                )}
                                <Tab eventKey={tabRecords.questions.value} title={i18n._(tabRecords.questions.label)}>
                                    {disableForStudent && quizData.quiz.state === "STARTED" ? (
                                        <RunningQuizTab quizState={quizData} logQuestion={logQuestion} />
                                    ) : (
                                        <QuestionsTab
                                            quizData={quizData}
                                            localUser={localUser}
                                            disableForStudent={disableForStudent}
                                        />
                                    )}
                                </Tab>
                                <Tab eventKey={tabRecords.statistics.value} title={i18n._(tabRecords.statistics.label)}>
                                    <QuizStatsTab />
                                </Tab>
                            </Tabs>
                        </Row>

                        <Row>
                            {activeKey === "questions" ? (
                                <div className="d-grid gap-2">
                                    <Button variant="info" onClick={() => setShowMDModal(true)}>
                                        Neuer Kommentar
                                    </Button>
                                </div>
                            ) : null}
                            <div
                                className="d-flex flex-row"
                                style={{
                                    maxHeight: "19rem",
                                    overflowY: "hidden",
                                    overflowX: "auto",
                                    backgroundColor: "#f5f5f5",
                                }}
                            >
                                {mbQuiz
                                    .flatMap(q => (keys(debug(q.quiz)).length > 0 ? maybe(q.quiz) : nothing()))
                                    .map(
                                        q =>
                                            (q.comments ?? [])
                                                .map(c => debug(comments.find(cmt => cmt.uid === c)!))
                                                .filter(Boolean) as Comment[]
                                    )
                                    .map(c =>
                                        c.sort(sortComments).map(cmt => (
                                            <div key={cmt.uid} style={{ width: "20rem", maxWidth: "95%" }}>
                                                <CommentCard
                                                    teachers={teachers}
                                                    userId={localUser.map(l => l.uid).orElse(toId(""))}
                                                    comment={cmt}
                                                    onUpvote={() => upvoteComment(cmt.uid)}
                                                    onAccept={() => finishComment(cmt.uid)}
                                                    onDelete={() => deleteComment(cmt.uid)}
                                                />
                                            </div>
                                        ))
                                    )
                                    .orElse([<Fragment />])}
                            </div>
                        </Row>
                    </Container>
                );
            },
            () => null
        );
};
