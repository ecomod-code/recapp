import React, { useEffect, useState } from "react";
import { Button, Modal, Form } from "react-bootstrap";
import { Trans } from "@lingui/react";
import { useNavigate } from "react-router-dom";
import { cookie } from "./utils";

export const Activate: React.FC = () => {
	const error = document.location.search.includes("error=userdeactivated");
	const quiz = document.location.search.includes("quiz=") && document.location.search.split("=")[1];
	const nav = useNavigate();
	const [showTempReminder, setShowTempReminder] = useState(false);
	const [persistentCookie, setPersistentCookie] = useState(true);

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
				<Modal.Title className="ps-2 p-1 text-bg-primary">
					<Trans id="login-page.account-deactivated-title" />
				</Modal.Title>
				<Modal.Body>
					<Trans id="login-page.account-deactivated-message" />
				</Modal.Body>
			</Modal>
			<Modal show={showTempReminder}>
				<Modal.Title className="ps-2 p-1 text-bg-primary">
					<Trans id="login-page.temp-login-header" />
				</Modal.Title>
				<Modal.Body>
					<Trans id="login-page.temp-login-reminder" />
					<Form.Group className="d-flex mb-2">
						<Form.Label>
							<Trans id="login-page.store-cookie-checkbox" />
						</Form.Label>
						<Form.Check
							name="store"
							type="checkbox"
							checked={persistentCookie}
							onChange={event => setPersistentCookie(event.target.checked)}
						/>
					</Form.Group>
				</Modal.Body>
				<Modal.Footer>
					<Button
						variant="primary"
						className="m-4"
						style={{ maxWidth: 150 }}
						href={`${import.meta.env.VITE_BACKEND_URI}/auth/temp?quiz=${quiz}&persistent=${persistentCookie}`}
					>
						<Trans id="login-page.login" />
					</Button>
					<Button
						variant="secondary"
						className="m-4"
						style={{ maxWidth: 150 }}
						onClick={() => setShowTempReminder(false)}
					>
						<Trans id="cancel" />
					</Button>
				</Modal.Footer>
			</Modal>
			<div>
				<h1>RECAPP</h1>
			</div>
			<div>
				<Trans id="login-page.info-text" />
			</div>
			<div>
				<Button
					variant="primary"
					href={`${import.meta.env.VITE_BACKEND_URI}/auth/login`}
					className="m-4"
					style={{ maxWidth: "30%", width: "30%" }}
				>
					<Trans id="login-page.login" />
				</Button>
			</div>
			<div>oder</div>

			<div>
				<Button
					variant="primary"
					className="m-4"
					style={{ maxWidth: "30%", width: "30%" }}
					onClick={() => setShowTempReminder(true)}
				>
					<Trans id="login-page.temporary-account-button" />
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
