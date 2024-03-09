import React, { useEffect } from "react";
import { Button, Modal } from "react-bootstrap";
import { Trans } from "@lingui/react";
import { useNavigate } from "react-router-dom";
import { cookie } from "./utils";

export const Activate: React.FC = () => {
	const error = document.location.search.includes("error=userdeactivated");
	const quiz = document.location.search.includes("quiz=") && document.location.search.split("=")[1];
	const nav = useNavigate();

	useEffect(() => {
		if (cookie("bearer")) {
			nav("/Dashboard/Quiz?q=" + quiz);
		} else {
			document.cookie = "activatedQuiz=" + quiz;
		}
	});
	return (
		<div>
			<Modal show={error}>
				<Modal.Title className="ps-2 p-1 text-bg-primary">Login-Fehler</Modal.Title>
				<Modal.Body>Ihr Account wurde deaktiviert. Bitte wenden Sie sich an Ihren Administrator.</Modal.Body>
			</Modal>
			<h1>RECAPP</h1>
			<h2>Melde dich an, um am Quiz teilzunehmen.</h2>
			<Button variant="primary" href={`${import.meta.env.VITE_BACKEND_URI}/auth/login`}>
				<Trans id="login-page.login" />
			</Button>
		</div>
	);
};
