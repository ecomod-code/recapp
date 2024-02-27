import React from "react";
import { UserAdminPanel } from "./UserAdminPanel";
import { Tab, Tabs } from "react-bootstrap";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { Editor } from "./Editor";

export const Dashboard: React.FC = () => {
	return (
		<React.StrictMode>
			<Tabs defaultActiveKey="users" className="mb-3 w-100 h-100">
				<Tab eventKey="quizzes" title={i18n._("dashboard-tab-label-quizzes")}>
					<Editor />
				</Tab>
				<Tab eventKey="users" title={i18n._("dashboard-tab-label-users")}>
					<UserAdminPanel />
				</Tab>
			</Tabs>
		</React.StrictMode>
	);
};
