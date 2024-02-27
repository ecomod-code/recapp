import React from "react";
import { Button, Modal } from "react-bootstrap";
import { Trans } from "@lingui/react";

export const Login: React.FC = () => {
	const error = document.location.search.includes("error=userdeactivated");
	return (
		<div>
			<Modal show={error}>
				<Modal.Title className="ps-2 p-1 text-bg-primary">Login-Fehler</Modal.Title>
				<Modal.Body>Ihr Account wurde deaktiviert. Bitte wenden Sie sich an Ihren Administrator.</Modal.Body>
			</Modal>
			<h1>RECAPP</h1>
			<Button variant="primary" href={`${import.meta.env.VITE_BACKEND_URI}/auth/login`}>
				<Trans id="login-page.login" />
			</Button>
		</div>
	);
};
