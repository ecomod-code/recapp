import React, { useEffect } from "react";
import { Button, Modal } from "react-bootstrap";
import { Trans } from "@lingui/react";
import { cookie } from "./utils";
import { useNavigate } from "react-router-dom";

export const Login: React.FC = () => {
	const nav = useNavigate();
	const error = document.location.search.includes("error=userdeactivated");
	useEffect(() => {
		if (cookie("bearer")) {
			nav("/Dashboard");
		}
	});
	return (
		<div className="text-center w-100 d-flex flex-column">
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
			<div className="m-4 d-flex flex-row justify-items-center w-100 flex-grow-1">
				<div className="align-self-end">
					<img width="300" src="./MWK-Wappen-RGB_Gefördert-durch_02.png" />
				</div>
			</div>
		</div>
	);
};
