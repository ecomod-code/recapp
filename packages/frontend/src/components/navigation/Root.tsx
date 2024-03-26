import { Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { Layout } from "../../layout/Layout";
import { useActorSystem, SystemContext } from "ts-actors-react";

import { UserAdminActor } from "../../actors/UserAdminActor";
import { LocalUserActor } from "../../actors/LocalUserActor";
import { CreateQuizActor } from "../../actors/CreateQuizActor";
import { CurrentQuizActor } from "../../actors/CurrentQuizActor";
import { ErrorActor } from "../../actors/ErrorActor";

import { Button, Modal } from "react-bootstrap";
import { serializeError } from "serialize-error";
import { cookie } from "../../utils";
import { actorUris } from "../../actorUris";
import { toActorUri } from "@recapp/models";
import { SharingActor } from "../../actors/SharingActor";

export const Root = () => {
	const [init, setInit] = useState(false);
	const [rpcError, setRpcError] = useState<string>("");
	const system = useActorSystem(`${import.meta.env.VITE_BACKEND_URI.replace("http", "ws")}`, cookie("bearer"));
	useEffect(() => {
		if (!init) {
			system.forEach(async s => {
				try {
					const ea = await s.createActor(ErrorActor, { name: "ErrorActor" });
					actorUris["ErrorActor"] = toActorUri(ea.name);
					const ua = await s.createActor(UserAdminActor, { name: "UserAdmin" });
					actorUris["UserAdmin"] = toActorUri(ua.name);
					const lu = await s.createActor(LocalUserActor, { name: "LocalUser" });
					actorUris["LocalUser"] = toActorUri(lu.name);
					const cuq = await s.createActor(CurrentQuizActor, { name: "CurrentQuiz" });
					actorUris["CurrentQuiz"] = toActorUri(cuq.name);
					const crq = await s.createActor(CreateQuizActor, { name: "CreateQuiz" });
					actorUris["CreateQuiz"] = toActorUri(crq.name);
					const qsa = await s.createActor(SharingActor, { name: "QuizSharing" });
					actorUris["QuizSharing"] = toActorUri(qsa.name);

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
