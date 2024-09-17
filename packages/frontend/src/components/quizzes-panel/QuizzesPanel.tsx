import React, { useEffect, useRef, useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { useNavigate } from "react-router-dom";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, Id, toId } from "@recapp/models";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Download, Funnel, Plus } from "react-bootstrap-icons";
import { ArchiveQuizMessage, DeleteQuizMessage, ToggleShowArchived } from "../../actors/LocalUserActor";
import { QuizCard } from "./QuizCard";
import { ShareModal } from "../modals/ShareModal";
import { QuizImportModal } from "../modals/QuizImportModal";
import { ArchiveQuizModal } from "../modals/ArchiveQuizModal";
import { maybe } from "tsmonads";
import { InputGroup } from "react-bootstrap";
import { TooltipWrapper } from "../TooltipWrapper";

export const QuizzesPanel: React.FC = () => {
	const nav = useNavigate();
    const [filter, setFilter] = useState("");
	const [shareModal, setShareModal] = useState("");
	const [deleteModal, setDeleteModal] = useState(toId(""));
	const [showDelete, setShowDelete] = useState(false);
	const [importModal, setImportModal] = useState(false);
	const [quizzes, setQuizzes] = useState<Array<Partial<Quiz>>>();
	const updateCounterRef = useRef<number>(0);
	const [state, tryLocalUserActor] = useStatefulActor<{
		user: User | undefined;
		quizzes: Map<Id, Partial<Quiz>>;
		showArchived: boolean;
		updateCounter: number;
		teachers: Map<Id, string[]>;
	}>("LocalUser");
	useEffect(() => {
		const counter = state.map(s => s.updateCounter).orElse(0);
		if (counter === updateCounterRef.current) {
			return;
		}
		updateCounterRef.current = counter;
		const q: Array<Partial<Quiz>> = state.map(s => Array.from(s.quizzes.values())).orElse([]);
		setQuizzes(
			q
				.filter(quiz => !quiz.archived || state.map(s => s.showArchived).orElse(false))
				.toSorted((a, b) => {
					if (!a.archived && b.archived) {
						return -1;
					}
					if (!b.archived && a.archived) {
						return 1;
					}
					// eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
					return b.updated?.value! - a.updated?.value!;
				})
		);
	}, [state]);

	const archiveAllowed = (quiz: Partial<Quiz>): true | undefined => {
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

	const deleteAllowed = (quiz: Partial<Quiz>): true | undefined => {
		const isAdmin = state
			.map(s => s.user)
			.map(u => u?.role === "ADMIN")
			.orElse(false);
		const isCreatingTeacher = state
			.map(s => s.user)
			.map(u => (u?.uid && (quiz.createdBy ? u?.uid === quiz.createdBy : u?.uid === quiz.teachers?.[0])) ?? false)
			.orElse(false);
		return isAdmin || isCreatingTeacher ? true : undefined;
	};

	const archiveQuiz = () => {
		tryLocalUserActor.forEach(q => q.send(q, new ArchiveQuizMessage(deleteModal)));
		setDeleteModal(toId(""));
	};

	const deleteQuiz = () => {
		tryLocalUserActor.forEach(q => q.send(q, new DeleteQuizMessage(deleteModal)));
		setDeleteModal(toId(""));
	};

    const filteredQuizzes = (quizzes ?? []).filter(u => u.title?.toLocaleLowerCase().includes(filter));

	return (
		<>
			<ArchiveQuizModal
				show={!!deleteModal}
				showDelete={showDelete}
				onClose={() => setDeleteModal(toId(""))}
				onSubmit={archiveQuiz}
				onDelete={deleteQuiz}
			/>

			<QuizImportModal show={importModal} onClose={() => setImportModal(false)} />

			<ShareModal quizLink={shareModal} onClose={() => setShareModal("")} />

			<div>
				<div className="d-flex gap-2 justify-content-end mt-3 mb-3">
					<Button
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={() => nav({ pathname: "/Dashboard/CreateQuiz" })}
					>
						<Plus size={28} />
						<Trans id="button-new-quiz" />
					</Button>
					<Button
						className="ps-1 d-flex justify-content-center align-items-center"
						onClick={() => setImportModal(true)}
					>
						<Download size={20} className="mx-2" />
						<Trans id="button-import-quiz" />
					</Button>
				</div>

				<InputGroup className="mb-3 mt-5">
					<TooltipWrapper title={i18n._("user-admin-panel.button-tooltip.filter")}>
						<InputGroup.Text>
							<Funnel />
						</InputGroup.Text>
					</TooltipWrapper>
					<Form.Control
						type="search"
						placeholder={i18n._("user-admin-panel-search-text")}
						value={filter}
						onChange={event => setFilter(event.target.value.toLocaleLowerCase())}
					/>
				</InputGroup>

				<div className="pt-2 border-2 border-top">
                    <div>
                        <Form.Switch
                            className="mb-5 ps-5 list-group-item"
                            label={i18n._("dashboard-show-archived-quizzes-switch")}
                            checked={state.map(s => s.showArchived).orElse(false)}
                            onChange={event =>
                                tryLocalUserActor.forEach(q => q.send(q, new ToggleShowArchived(event.target.checked)))
                            }
                        />
                    </div>
					{filteredQuizzes.map(q => {
						return (
							<QuizCard
								key={q.uid}
								quiz={q}
								onShare={() => setShareModal(q.uniqueLink!)}
								onDelete={() => {
									if (archiveAllowed(q)) {
										setShowDelete(!!deleteAllowed(q));
										setDeleteModal(q.uid!);
									}
								}}
								teachers={state.flatMap(s => maybe(s.teachers.get(q.uid!))).orElse([])}
							/>
						);
					})}
				</div>
			</div>
		</>
	);
};
