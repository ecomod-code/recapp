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
			nav({ pathname: "/Dashboard/Quiz" }, { state: { quizId: quiz, activate: true } });
		} else {
			document.cookie = "activatedQuiz=" + quiz;
		}
	});
	return (
		<div className="text-center w-100 d-flex flex-column vh-100">
			<Modal show={error}>
				<Modal.Title className="ps-2 p-1 text-bg-primary">Login-Fehler</Modal.Title>
				<Modal.Body>Ihr Account wurde deaktiviert. Bitte wenden Sie sich an Ihren Administrator.</Modal.Body>
			</Modal>
			<div>
				<h1>RECAPP</h1>
			</div>
			<div>
				<Button
					variant="primary"
					href={`${import.meta.env.VITE_BACKEND_URI}/auth/login`}
					className="m-4"
					style={{ maxWidth: "30%" }}
				>
					<Trans id="login-page.login" />
				</Button>
			</div>
			<div className="m-4 d-flex flex-row justify-items-center flex-grow-1 align-items-end">
				<div>
					<img width="300" src="./GOE_Logo_Quer_Farbe_RGB.png" />
				</div>
				<div className="flex-grow-1">&nbsp;</div>
				<div>
					<img width="300" src="./MWK-Wappen-RGB_Gefördert-durch_02.png" />
				</div>
			</div>
		</div>
	);
};
