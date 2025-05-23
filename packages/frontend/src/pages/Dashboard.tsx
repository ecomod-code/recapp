import React, { useEffect } from "react";
import { UserAdminPanel } from "../UserAdminPanel";
import { FingerprintPanel } from "../FingerprintPanel";
import { Tab, Tabs } from "react-bootstrap";
import { i18n } from "@lingui/core";
import { QuizzesPanel } from "../components/quizzes-panel/QuizzesPanel";
import { User } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { ErrorMessages } from "../actors/ErrorActor";
import { useNavigate } from "react-router-dom";
import { cookie } from "../utils";
import { CurrentQuizMessages, CurrentQuizState } from "../actors/CurrentQuizActor";
import { Spinner } from "react-bootstrap";

// const tabClasses = "bg-content-container py-3";
const tabClasses = "py-3";

export const Dashboard: React.FC = () => {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_, errorActor] = useStatefulActor("ErrorActor");
	const [state] = useStatefulActor<{ user: User }>("LocalUser");
	const [mbQuiz, tryQuizActor] = useStatefulActor<CurrentQuizState>("CurrentQuiz");
	const nav = useNavigate();

	useEffect(() => {
		const quiz = cookie("activatedQuiz");
		if (quiz) {
			document.cookie = "activatedQuiz=";
			nav({ pathname: "/Dashboard/Quiz" }, { state: { quizId: quiz, activate: true } });
		} else {
			mbQuiz.map(q => q.deleted).map(d => d && tryQuizActor.map(a => a.send(a, CurrentQuizMessages.Reset())));
		}
	});

	if (state.map(lu => !lu.user.active).orElse(false)) {
		errorActor.forEach(actor =>
			actor.send(actor, ErrorMessages.SetError(new Error("Error: User was deactivated")))
		);
	}

	const isAdmin = state.map(lu => lu.user.role === "ADMIN").orElse(false);

    // Show spinner while user or quiz state is not loaded
    if (state.isEmpty() || mbQuiz.isEmpty()) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

	return (
		<React.StrictMode>
			<Tabs defaultActiveKey={isAdmin ? "users" : "quizzes"} className="w-100 h-100">
				<Tab eventKey="quizzes" className={tabClasses} title={i18n._("dashboard-tab-label-quizzes")}>
					<QuizzesPanel />
				</Tab>
				{isAdmin && (
					<Tab eventKey="users" className={tabClasses} title={i18n._("dashboard-tab-label-users")}>
						<UserAdminPanel />
					</Tab>
				)}
				{isAdmin && (
					<Tab eventKey="fingerprints" className={tabClasses} title={i18n._("dashboard-tab-label-fingerprints")}>
						<FingerprintPanel />
					</Tab>
				)}
			</Tabs>
		</React.StrictMode>
	);
};
