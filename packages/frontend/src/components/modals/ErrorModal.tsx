import { useEffect, useState } from "react";
import { useStatefulActor } from "ts-actors-react";
import { Modal, Button } from "react-bootstrap";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";

export const ErrorModal: React.FC = () => {
	const [errorState] = useStatefulActor<{ error: string }>("ErrorActor");
	const [rpcError, setRpcError] = useState<string>("");

	const onRpcError = () => {
		setRpcError("");
		document.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
	};

	useEffect(() => {
		errorState.forEach(state => {
			setRpcError(state.error);
		});
	}, [errorState]);

	if (rpcError !== "") {
		return (
			<Modal show={true}>
				<Modal.Title className="ps-2 bg-warning">{i18n._(rpcError + "-title")}</Modal.Title>
				<Modal.Body>
					<Trans id={rpcError} />
				</Modal.Body>
				<Modal.Footer className="p-0">
					<Button onClick={onRpcError}>{i18n._("button-login-again")}</Button>
				</Modal.Footer>
			</Modal>
		);
	}

	return null;
};
