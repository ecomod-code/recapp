import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { Layout } from "../../layout/Layout";
import { useActorSystem, SystemContext } from "ts-actors-react";
import { UserAdminActor } from "../../actors/UserAdminActor";
import { LocalUserActor } from "../../actors/LocalUserActor";
import { CurrentQuizActor } from "../../actors/CurrentQuizActor";
import { Button, Modal } from "react-bootstrap";
import { serializeError } from "serialize-error";
import { ErrorActor } from "../../actors/ErrorActor";
import { cookie } from "../../utils";

export const Root = () => {
	const [init, setInit] = useState(false);
	const [rpcError, setRpcError] = useState<string>("");
	const system = useActorSystem(`${import.meta.env.VITE_BACKEND_URI.replace("http", "ws")}`, cookie("bearer"));
	useEffect(() => {
		if (!init) {
			system.forEach(async s => {
				try {
					await s.createActor(ErrorActor, { name: "ErrorActor" });
					await s.createActor(UserAdminActor, { name: "UserAdmin" });
					await s.createActor(LocalUserActor, { name: "LocalUser" });
					await s.createActor(CurrentQuizActor, { name: "CurrentQuiz" });

					setInit(true);

					const sa = s.getActorRef(`actors://${s.systemName}`);
				} catch (e) {
					console.error(e);
				}
			});
			system.onFailure(e => {
				const err = serializeError(e);
				if (!err.message?.toLocaleLowerCase().includes("not initialized")) {
					setRpcError("error-message-no-server-connection");
				}
			});
		}
	}, [init, system]);
	const navigate = useNavigate();
	const onRpcError = () => {
		setRpcError("");
		document.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
	};

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
		<SystemContext.Provider value={system}>
			<Layout>
				<Outlet />
			</Layout>
		</SystemContext.Provider>
	);
};
