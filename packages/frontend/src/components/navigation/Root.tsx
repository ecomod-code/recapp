import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { Layout } from "../../layout/Layout";
import { SystemContext } from "ts-actors-react";

import { Button, Modal } from "react-bootstrap";
import { cookie } from "../../utils";
import { system } from "../../system";
import { ActorSystem } from "ts-actors";
import { Try, fromError, fromValue } from "tsmonads";

export const Root = () => {
	const [init, setInit] = useState<Try<ActorSystem>>(fromError(new Error()));
	const [rpcError, setRpcError] = useState<string>("");

	const navigate = useNavigate();
	const onRpcError = () => {
		setRpcError("");
		document.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
	};

	useEffect(() => {
		const run = async () => {
			try {
				const s: ActorSystem = await system;
				setInit(fromValue(s));
			} catch (e) {
				setInit(fromError(e as Error));
			}
		};
		run();
	}, []);

	if (rpcError !== "") {
		return (
			<Modal show={true}>
				<Modal.Title className="ps-2 bg-warning">{i18n._(rpcError + "-title")}</Modal.Title>
				<Modal.Body>
					<Trans id={rpcError} />
				</Modal.Body>
				<Modal.Footer className="p-0">
					<Button onClick={onRpcError}>Neu anmelden</Button>
				</Modal.Footer>
			</Modal>
		);
	}
	if (!init) {
		return null;
	}
	if (!cookie("bearer")) {
		navigate("/", { replace: true });
	}
	return (
		<SystemContext.Provider value={init}>
			<Layout>
				<Outlet />
			</Layout>
		</SystemContext.Provider>
	);
};
