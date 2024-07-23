// import { CSSProperties, PropsWithChildren, useState } from "react";
import { useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
// import { Id, Question, QuestionGroup, Quiz, User, UserRole, toId } from "@recapp/models";
import { Id, Question, Quiz, User, UserRole, toId } from "@recapp/models";
import { useNavigate } from "react-router-dom";
import { useStatefulActor } from "ts-actors-react";
import { Maybe, maybe } from "tsmonads";

// import Accordion from "react-bootstrap/Accordion";
// import Button, { ButtonProps } from "react-bootstrap/Button";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
// import { ArrowDown, ArrowUp, Pencil, Plus } from "react-bootstrap-icons";
import { Plus } from "react-bootstrap-icons";
import { QuestionCard } from "../cards/QuestionCard";

import { CurrentQuizMessages, CurrentQuizState } from "../../actors/CurrentQuizActor";
import { YesNoModal } from "../modals/YesNoModal";
// import { ChangeGroupModal } from "../modals/ChangeGroupModal";
// import { CreateGroupModal } from "../modals/CreateGroupModal";

// const BUTTON_CONTAINER_WIDTH = 40;

export const QuestionsTab: React.FC<{
    quizData: CurrentQuizState;
    localUser: Maybe<User>;
    disableForStudent: boolean;
}> = ({ quizData, disableForStudent, localUser }) => {
    const nav = useNavigate();
    const [deleteModal, setDeleteModal] = useState(toId(""));
    const [removeEditModal, setRemoveEditModal] = useState(toId(""));
    const [mbQuiz, tryQuizActor] = useStatefulActor<{ quiz: Quiz; comments: Comment[]; questions: Question[] }>(
        "CurrentQuiz"
    );
    const userId: Id = localUser.map(u => u.uid).orElse(toId("---"));
    const userRole: UserRole = localUser.map(u => u.role).orElse("STUDENT");
    const disableForStudentOrMode = disableForStudent || quizData.quiz.state !== "EDITING";
    const noQuestions =
        userRole !== "ADMIN" && !quizData.quiz.teachers.includes(userId) && !quizData.quiz.studentQuestions;
    const disableForSettingOrMode = noQuestions || quizData.quiz.state !== "EDITING";

    // const [currentGroup, setCurrentGroup] = useState({
    //     showNameModal: false,
    //     name: "",
    // });
    // const [changeGroup, setChangeGroup] = useState({
    //     qId: "",
    //     currentGroup: "",
    // });

    // const addGroup = (name: string) => {
    //     const newGroups = [...quizData.quiz.groups];
    //     const editedGroup = newGroups.find(g => g.name === currentGroup.name);
    //     if (editedGroup) editedGroup.name = name;
    //     else newGroups.push({ name, questions: [] });
    //     setCurrentGroup({ showNameModal: false, name: "" });
    //     tryQuizActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update({ groups: newGroups })));
    // };

    // const moveGroup = (name: string, upwards: boolean) => {
    //     const newGroups: QuestionGroup[] = [];
    //     const groupIndex = quizData.quiz.groups.findIndex(g => g.name === name);
    //     const changeIndex = upwards ? groupIndex - 1 : groupIndex + 1;
    //     quizData.quiz.groups.forEach((group, index) => {
    //         if (index === groupIndex) {
    //             return;
    //         }
    //         if (index === changeIndex) {
    //             if (upwards) {
    //                 newGroups.push(quizData.quiz.groups[groupIndex]);
    //                 newGroups.push(group);
    //             } else {
    //                 newGroups.push(group);
    //                 newGroups.push(quizData.quiz.groups[groupIndex]);
    //             }
    //         } else {
    //             newGroups.push(group);
    //         }
    //     });
    //     tryQuizActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update({ groups: newGroups })));
    // };

    const moveQuestion = (groupName: string, qId: Id, upwards: boolean) => {
        const newOrder: Id[] = [];
        const group = quizData.quiz.groups.find(g => g.name === groupName)!;
        const questionIndex = group.questions.findIndex(g => g === qId);
        const changeIndex = upwards ? questionIndex - 1 : questionIndex + 1;
        group.questions.forEach((qid, index) => {
            if (index === questionIndex) {
                return;
            }
            if (index === changeIndex) {
                if (upwards) {
                    newOrder.push(group.questions[questionIndex]);
                    newOrder.push(qid);
                } else {
                    newOrder.push(qid);
                    newOrder.push(group.questions[questionIndex]);
                }
            } else {
                newOrder.push(qid);
            }
        });
        group.questions = newOrder;
        tryQuizActor.forEach(a => a.send(a.name, CurrentQuizMessages.Update({ groups: quizData.quiz.groups })));
    };

    const approveQuestion = (uid: Id, approved: boolean) => {
        tryQuizActor.forEach(a =>
            a.send(a.name, CurrentQuizMessages.UpdateQuestion({ question: { uid, approved: !approved }, group: "" }))
        );
    };

    const editQuestion = (uid: Id, group: string) => {
        const writeAccess =
            quizData.quiz.state === "EDITING" &&
            (teachers.includes(localUser.map(u => u.uid).orElse(toId(""))) ||
                mbQuiz
                    .flatMap(q => maybe(q.questions))
                    .map(
                        qs => !!qs.find(q => q.uid === uid && q.authorId === localUser.map(u => u.uid).orElse(toId("")))
                    )
                    .orElse(false));

        if (quizData.questions.find(q => q.uid === uid)?.editMode && writeAccess) {
            setRemoveEditModal(uid);
        } else {
            nav(
                { pathname: "/Dashboard/Question" },
                { state: { quizId: uid, group, write: writeAccess ? "true" : undefined } }
            );
        }
    };

    const deleteQuestion = () => {
        tryQuizActor.forEach(q => q.send(q, CurrentQuizMessages.DeleteQuestion(deleteModal)));
        setDeleteModal(toId(""));
    };

    const removeEditFlag = () => {
        tryQuizActor.forEach(q =>
            q.send(
                q,
                CurrentQuizMessages.UpdateQuestion({ question: { uid: removeEditModal, editMode: false }, group: "" })
            )
        );
        setRemoveEditModal(toId(""));
    };

    const teachers: string[] = quizData.quiz.teachers ?? [];
    const unfilteredQuestions: Question[] = mbQuiz.map(q => q.questions).orElse([]);
    const questions = unfilteredQuestions.filter(q => {
        const user: Id = localUser.map(l => l.uid).orElse(toId(""));
        if (localUser.map(l => l.role).orElse("STUDENT") === "ADMIN") {
            return true;
        }
        if (q.approved) return true;
        if (q.authorId === user) return true;
        if (teachers.includes(user)) return true;
        console.log("The following question will not be displayed", q, "for user ", user, " and teachers ", teachers);
        return false;
    });

    const defaultQuestionGroup = quizData.quiz.groups[0];

    // const defaultQuestionGroup = [
    //     quizData.quiz.groups[0],
    //     quizData.quiz.groups[0],
    //     quizData.quiz.groups[0],
    //     quizData.quiz.groups[0],
    // ];

    return (
        <>
            <YesNoModal
                show={!!removeEditModal}
                titleId="remove-edit-mode-of-question-title"
                textId="remove-edit-mode-of-question-text"
                onClose={() => setRemoveEditModal(toId(""))}
                onSubmit={removeEditFlag}
            />
            <YesNoModal
                show={!!deleteModal}
                titleId="delete-question-title"
                textId="delete-question-text"
                onClose={() => setDeleteModal(toId(""))}
                onSubmit={deleteQuestion}
            />
            {/* <ChangeGroupModal
                show={!!changeGroup.currentGroup}
                groups={quizData.quiz.groups.map(g => g.name)}
                currentGroup={changeGroup.currentGroup}
                onClose={() => setChangeGroup({ currentGroup: "", qId: "" })}
                onSubmit={newGroup => {
                    tryQuizActor.forEach(actor =>
                        actor.send(
                            actor.name,
                            CurrentQuizMessages.UpdateQuestion({
                                question: { uid: toId(changeGroup.qId) },
                                group: newGroup,
                            })
                        )
                    );
                    setChangeGroup({ currentGroup: "", qId: "" });
                }}
            /> */}
            {/* <CreateGroupModal
                show={currentGroup.showNameModal}
                invalidValues={quizData.quiz.groups.map(g => g.name).filter(n => n !== currentGroup.name)}
                onClose={() => setCurrentGroup({ showNameModal: false, name: "" })}
                onSubmit={addGroup}
                defaultValue={currentGroup.name}
            /> */}
            <div className="d-flex flex-column h-100 w-100">
                <div className="d-flex gap-2 align-items-center justify-content-between mb-4 flex-wrap">
                    <div>
                        {i18n._("quiz-card-number-of-questions", { count: quizData.questions.length })},{" "}
                        {i18n._("quiz-card-number-of-participants", { count: quizData.quiz.students.length })}
                    </div>

                    {quizData.quiz.state === "EDITING" ? (
                        <Button
                            className="ps-1 col-12 col-lg-auto d-flex justify-content-center align-items-center mb-3"
                            variant="primary"
                            disabled={disableForSettingOrMode}
                            onClick={() => {
                                const writeAccess = true;
                                nav(
                                    { pathname: "/Dashboard/Question" },
                                    {
                                        state: {
                                            // group: questionGroup.name,
                                            write: writeAccess ? "true" : undefined,
                                        },
                                    }
                                );
                            }}
                        >
                            <Plus size={28} />
                            <Trans id="quiz-questions-tab-new-question-button" />
                        </Button>
                    ) : null}

                    {/* <Button
                            className="ps-1 col-12 col-lg-auto d-flex justify-content-center align-items-center mb-3"
                            onClick={() => setCurrentGroup({ showNameModal: true, name: "" })}
                            disabled={disableForStudentOrMode}
                        >
                            <Plus size={28} />
                            <Trans id="quiz-questions-tab-add-group-button" />
                        </Button> */}
                </div>

                <Row>
                    <div className="d-flex flex-column">
                        {defaultQuestionGroup?.questions.length === 0 ? (
                            <p
                                className="p-2 m-0 me-2 d-flex justify-content-center align-items-center text-center bg-white"
                                style={{ fontSize: 18, height: 80 }}
                            >
                                <Trans id="quiz-questions-tab-empty-group-message" />
                            </p>
                        ) : null}
                        {defaultQuestionGroup?.questions
                            .map(q => questions.find(qu => qu.uid === q))
                            .filter(Boolean)
                            .map((q, i, arr) => {
                                const isFirst = i === 0;
                                const isLast = i === arr.length - 1;
                                const isStudentQuestionsAllowed = quizData.quiz.studentQuestions;

                                const writeAccess =
                                    teachers.includes(localUser.map(u => u.uid).orElse(toId(""))) ||
                                    mbQuiz
                                        .flatMap(q => maybe(q.questions))
                                        .map(
                                            qs =>
                                                !!qs.find(
                                                    qu =>
                                                        isStudentQuestionsAllowed &&
                                                        qu.uid === q!.uid &&
                                                        qu.authorId === localUser.map(u => u.uid).orElse(toId(""))
                                                )
                                        )
                                        .orElse(false);
                                return (
                                    <QuestionCard
                                        writeAccess={writeAccess}
                                        key={q!.uid}
                                        editMode={quizData.quiz.state === "EDITING"}
                                        question={q!}
                                        approve={() => approveQuestion(q!.uid, q!.approved)}
                                        delete={() => setDeleteModal(q!.uid)}
                                        edit={() => editQuestion(q!.uid, defaultQuestionGroup.name)}
                                        state={quizData.quiz.state}
                                        moveUp={() => moveQuestion(defaultQuestionGroup.name, q!.uid, true)}
                                        moveDown={() => moveQuestion(defaultQuestionGroup.name, q!.uid, false)}
                                        // changeGroup={() => {
                                        //     if (quizData.quiz.groups.length < 2) {
                                        //         return;
                                        //     }
                                        //     setChangeGroup({
                                        //         qId: q!.uid,
                                        //         currentGroup: questionGroup.name,
                                        //     });
                                        // }}
                                        currentUserUid={localUser.map(u => u.uid).orElse(toId(""))}
                                        disabled={disableForStudentOrMode}
                                        isFirst={isFirst}
                                        isLast={isLast}
                                    />
                                );
                            })}
                    </div>
                </Row>

                {/* <Row>
                    <div className="flex-grow-1">
                        <Accordion defaultActiveKey="0">
                            {quizData.quiz.groups.map((questionGroup, index, arr) => {
                                const isFirst = index === 0;
                                const isLast = index === arr.length - 1;

                                return (
                                    <Accordion.Item
                                        key={questionGroup.name}
                                        eventKey={questionGroup.name}
                                        className="mb-2"
                                    >
                                        <div className="position-relative">
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    zIndex: 10,
                                                    right: 0,
                                                    bottom: 0,
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                <span style={{ marginRight: 12, fontSize: 16 }}>
                                                    {i18n._("quiz-card-number-of-questions", {
                                                        count: questionGroup.questions?.filter(Boolean).length ?? 0,
                                                    })}
                                                </span>

                                                {quizData.quiz.state === "EDITING" ? (
                                                    <Button
                                                        style={{
                                                            pointerEvents: "auto",
                                                            paddingLeft: 4,
                                                        }}
                                                        variant="outline-primary"
                                                        disabled={disableForSettingOrMode}
                                                        size="sm"
                                                        onClick={() => {
                                                            const writeAccess = true;
                                                            nav(
                                                                { pathname: "/Dashboard/Question" },
                                                                {
                                                                    state: {
                                                                        group: questionGroup.name,
                                                                        write: writeAccess ? "true" : undefined,
                                                                    },
                                                                }
                                                            );
                                                        }}
                                                    >
                                                        <span>
                                                            <Plus size={24} />
                                                            <Trans id="quiz-questions-tab-new-question-button" />
                                                        </span>
                                                    </Button>
                                                ) : null}
                                            </div>
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    zIndex: 10,
                                                    top: 0,
                                                    left: 4,
                                                    bottom: 0,
                                                    width: BUTTON_CONTAINER_WIDTH,

                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: "space-around",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Button
                                                    variant="light"
                                                    style={{ border: "1px solid grey" }}
                                                    disabled={disableForStudentOrMode || isFirst}
                                                    size="sm"
                                                    onClick={() => moveGroup(questionGroup.name, true)}
                                                >
                                                    <ArrowUp />
                                                </Button>

                                                <Button
                                                    variant="light"
                                                    style={{ border: "1px solid grey" }}
                                                    disabled={disableForStudentOrMode || isLast}
                                                    size="sm"
                                                    onClick={() => moveGroup(questionGroup.name, false)}
                                                >
                                                    <ArrowDown />
                                                </Button>
                                            </div>
                                            <Accordion.Header as="div">
                                                <div
                                                    className="d-flex w-100 align-items-center"
                                                    style={{ minHeight: 100, paddingLeft: BUTTON_CONTAINER_WIDTH }}
                                                >
                                                    <div className="flex-grow-1">
                                                        <span>
                                                            <strong>{questionGroup.name} </strong>

                                                            <NestedButton
                                                                variant="link"
                                                                size="sm"
                                                                isDisabled={disableForStudentOrMode}
                                                                containerStyles={{ paddingLeft: 4, marginLeft: 4 }}
                                                                onClick={() =>
                                                                    setCurrentGroup({
                                                                        showNameModal: true,
                                                                        name: questionGroup.name,
                                                                    })
                                                                }
                                                            >
                                                                <Pencil />
                                                                {i18n._("button-label-edit")}
                                                            </NestedButton>
                                                        </span>
                                                    </div>
                                                    <div style={{ width: 32 }}></div>
                                                </div>
                                            </Accordion.Header>
                                        </div>

                                        <Accordion.Body className="p-1 ps-3 accordion-active-bg-color">
                                            <div
                                                className="d-flex flex-column"
                                                style={{ maxHeight: "70vh", overflowY: "auto" }}
                                            >
                                                {questionGroup.questions.length === 0 ? (
                                                    <p
                                                        className="p-2 m-0 me-2 d-flex justify-content-center align-items-center text-center bg-white"
                                                        style={{ fontSize: 18, height: 80 }}
                                                    >
                                                        <Trans id="quiz-questions-tab-empty-group-message" />
                                                    </p>
                                                ) : null}
                                                {questionGroup.questions
                                                    .map(q => questions.find(qu => qu.uid === q))
                                                    .filter(Boolean)
                                                    .map((q, i, arr) => {
                                                        const isFirst = i === 0;
                                                        const isLast = i === arr.length - 1;
                                                        const writeAccess =
                                                            teachers.includes(
                                                                localUser.map(u => u.uid).orElse(toId(""))
                                                            ) ||
                                                            mbQuiz
                                                                .flatMap(q => maybe(q.questions))
                                                                .map(
                                                                    qs =>
                                                                        !!qs.find(
                                                                            qu =>
                                                                                qu.uid === q!.uid &&
                                                                                qu.authorId ===
                                                                                    localUser
                                                                                        .map(u => u.uid)
                                                                                        .orElse(toId(""))
                                                                        )
                                                                )
                                                                .orElse(false);
                                                        return (
                                                            <QuestionCard
                                                                writeAccess={writeAccess}
                                                                key={q!.uid}
                                                                editMode={quizData.quiz.state === "EDITING"}
                                                                question={q!}
                                                                approve={() => approveQuestion(q!.uid, q!.approved)}
                                                                delete={() => setDeleteModal(q!.uid)}
                                                                edit={() => editQuestion(q!.uid, questionGroup.name)}
                                                                state={quizData.quiz.state}
                                                                moveUp={() =>
                                                                    moveQuestion(questionGroup.name, q!.uid, true)
                                                                }
                                                                moveDown={() =>
                                                                    moveQuestion(questionGroup.name, q!.uid, false)
                                                                }
                                                                changeGroup={() => {
                                                                    if (quizData.quiz.groups.length < 2) {
                                                                        return;
                                                                    }
                                                                    setChangeGroup({
                                                                        qId: q!.uid,
                                                                        currentGroup: questionGroup.name,
                                                                    });
                                                                }}
                                                                currentUserUid={localUser
                                                                    .map(u => u.uid)
                                                                    .orElse(toId(""))}
                                                                disabled={disableForStudentOrMode}
                                                                isFirst={isFirst}
                                                                isLast={isLast}
                                                            />
                                                        );
                                                    })}
                                            </div>
                                        </Accordion.Body>
                                    </Accordion.Item>
                                );
                            })}
                        </Accordion>
                    </div>
                </Row> */}
            </div>
        </>
    );
};

// const NestedButton = (
//     props: {
//         isDisabled?: boolean;
//         onClick: () => void;
//         variant?: ButtonProps["variant"];
//         containerStyles?: CSSProperties;
//         size?: ButtonProps["size"];
//     } & PropsWithChildren
// ) => {
//     const isVariantLink = props.variant === "link";

//     return (
//         <Button
//             as="span"
//             style={{
//                 ...(isVariantLink
//                     ? { position: "relative", bottom: 3 }
//                     : { borderColor: props.isDisabled ? "grey" : undefined }),
//                 ...props.containerStyles,
//             }}
//             size={props.size}
//             variant={props.variant}
//             className={props.isDisabled ? "disabled" : ""}
//             onClick={e => {
//                 e.stopPropagation();

//                 if (props.isDisabled) return;
//                 props.onClick();
//             }}
//         >
//             <span style={props.isDisabled ? { color: "grey" } : {}}>
//                 {/*  */}
//                 {props.children}
//             </span>
//         </Button>
//     );
// };
