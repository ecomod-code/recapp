import React, { useEffect, useRef, useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { useNavigate } from "react-router-dom";
import { useStatefulActor } from "ts-actors-react";
import { Quiz, User, Id, toId } from "@recapp/models";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import { Download, Plus } from "react-bootstrap-icons";
import { ArchiveQuizMessage, DeleteQuizMessage, ToggleShowArchived } from "../../actors/LocalUserActor";
import { QuizCard } from "./QuizCard";
import { ShareModal } from "../modals/ShareModal";
import { QuizImportModal } from "../modals/QuizImportModal";
import { ArchiveQuizModal } from "../modals/ArchiveQuizModal";
import { maybe } from "tsmonads";

export const QuizzesPanel: React.FC = () => {
	const nav = useNavigate();
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

				<div className="border-2 border-top pt-2">
					<div>
						<Form.Switch
							className="list-group-item ps-5"
							label={i18n._("dashboard-show-archived-quizzes-switch")}
							checked={state.map(s => s.showArchived).orElse(false)}
							onChange={event =>
								tryLocalUserActor.forEach(q => q.send(q, new ToggleShowArchived(event.target.checked)))
							}
						/>
					</div>
					{(quizzes ?? []).map(q => {
						return (
							<QuizCard
								key={q.uid}
								quiz={q}
								onStart={() => {
									nav({ pathname: "/Dashboard/quiz" }, { state: { quizId: q.uid, start: true } });
								}}
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
