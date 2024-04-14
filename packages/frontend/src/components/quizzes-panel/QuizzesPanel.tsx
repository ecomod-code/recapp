import React, { useEffect, useRef, useState } from "react";
import { Trans } from "@lingui/react";
import { useNavigate } from "react-router-dom";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, Id, toId } from "@recapp/models";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import { Plus } from "react-bootstrap-icons";
import { ArchiveQuizMessage } from "../../actors/LocalUserActor";
import { QuizCard } from "./QuizCard";
import { ShareModal } from "../modals/ShareModal";
import { YesNoModal } from "../modals/YesNoModal";

export const QuizzesPanel: React.FC = () => {
    const nav = useNavigate();
    const [shareModal, setShareModal] = useState("");
    const [deleteModal, setDeleteModal] = useState(toId(""));
    const [quizzes, setQuizzes] = useState<Array<Partial<Quiz>>>();
    const updateCounterRef = useRef<number>(0);
    const [state, tryLocalUserActor] = useStatefulActor<{
        user: User | undefined;
        quizzes: Map<Id, Partial<Quiz>>;
        updateCounter: number;
    }>("LocalUser");
    useEffect(() => {
        const counter = state.map(s => s.updateCounter).orElse(0);
        if (counter === updateCounterRef.current) {
            return;
        }
        updateCounterRef.current = counter;
        const q: Array<Partial<Quiz>> = state.map(s => Array.from(s.quizzes.values())).orElse([]);
        setQuizzes(
            q.toSorted((a, b) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                return b.updated?.value! - a.updated?.value!;
            })
        );
    }, [state]);

    const deleteAllowed = (quiz: Partial<Quiz>): true | undefined => {
        const isAdmin = state
            .map(s => s.user)
            .map(u => u?.role === "ADMIN")
            .orElse(false);
        const isTeacher = state
            .map(s => s.user)
            .map(u => (u?.uid && quiz.teachers?.includes(u?.uid)) ?? false)
            .orElse(false);
        return isAdmin || isTeacher ? true : undefined;
    };

    const deleteQuestion = () => {
        tryLocalUserActor.forEach(q => q.send(q, new ArchiveQuizMessage(deleteModal)));
        setDeleteModal(toId(""));
    };

    return (
        <Container fluid className="p-0">
            <div className="d-flex justify-content-end">
                <Button
                    className="ps-1 d-flex justify-content-center align-items-center mb-3"
                    onClick={() => nav({ pathname: "/Dashboard/CreateQuiz" })}
                >
                    <Plus size={28} />
                    <Trans id="button-new-quiz" />
                </Button>
            </div>
            <YesNoModal
                show={!!deleteModal}
                titleId="archive-quiz-title"
                textId="archive-quiz-text"
                onClose={() => setDeleteModal(toId(""))}
                onSubmit={deleteQuestion}
            />

            <ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />

            <Container
                fluid
                className="border-2 border-top"
                // style={{ maxHeight: "70vh", overflowY: "auto" }}
            >
                {(quizzes ?? []).map(q => {
                    return (
                        <QuizCard
                            key={q.uid}
                            quiz={q}
                            onShare={() => setShareModal(q.uniqueLink!)}
                            onDelete={deleteAllowed(q) && (() => setDeleteModal(q.uid!))}
                        />
                    );
                })}
            </Container>
        </Container>
    );
};
