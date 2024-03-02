import React from "react";
import { UserAdminPanel } from "./UserAdminPanel";
import { Tab, Tabs } from "react-bootstrap";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { Editor } from "./Editor";
import { User } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { ErrorMessages } from "./actors/ErrorActor";

export const Dashboard: React.FC = () => {
	const [_, errorActor] = useStatefulActor("ErrorActor");
	const [state] = useStatefulActor<{ user: User }>("LocalUser");

	if (state.map(lu => !lu.user.active).orElse(false)) {
		errorActor.forEach(actor =>
			actor.send(actor, ErrorMessages.SetError(new Error("Error: User was deactivated")))
		);
	}

	return (
		<React.StrictMode>
			<Tabs defaultActiveKey="users" className="mb-3 w-100 h-100">
				<Tab eventKey="quizzes" title={i18n._("dashboard-tab-label-quizzes")}>
					<Editor quizId="demo-quiz" />
				</Tab>
				<Tab eventKey="users" title={i18n._("dashboard-tab-label-users")}>
					<UserAdminPanel />
				</Tab>
			</Tabs>
		</React.StrictMode>
	);
};
