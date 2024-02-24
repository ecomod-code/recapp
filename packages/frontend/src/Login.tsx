import React from "react";
import { Button } from "react-bootstrap";
import { Trans } from "@lingui/react";

export const Login: React.FC = () => {
	return (
		<div>
			<h1>RECAPP</h1>
			<Button variant="primary" href="http://localhost:3123/auth/login">
				<Trans id="login-page.login" />
			</Button>
		</div>
	);
};
