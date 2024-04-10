import { useContext, useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { Button, Modal, Form } from "react-bootstrap";
import { SystemContext } from "ts-actors-react";
import { UserStoreMessages } from "@recapp/models";

interface Props {
	show: boolean;
	defaultValue: string;
	onClose: () => void;
	onSubmit: (name: string) => void;
}

export const ChangeNicknameModal: React.FC<Props> = ({ show, defaultValue, onClose, onSubmit }) => {
	const system = useContext(SystemContext);
	const [name, setName] = useState(defaultValue);
	const [error, setError] = useState("");

	const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = event.target.value;
		setName(newValue);
		setError("");
		if (newValue.length <= 3) {
			setError(i18n._("error-nickname-to-short"));
			return;
		} else if (newValue === defaultValue) {
			return;
		} else {
			await system.map(s =>
				s
					.ask("actors://recapp-backend/UserStore", UserStoreMessages.IsNicknameUnique(newValue))
					.then(result => !result && setError(i18n._("error-nickname-already-used")))
			);
		}
	};

	return (
		<Modal show={show}>
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<Trans id="user-change-nickname-modal-title" />
			</Modal.Title>
			<Modal.Body>
				<Form.Control className="mb-2" defaultValue={defaultValue} value={name} onChange={onChange} />
				<span className="text-danger">{error}&nbsp;</span>
			</Modal.Body>
			<Modal.Footer>
				<Button className="m-1" disabled={error !== ""} onClick={() => onSubmit(name)}>
					<Trans id="okay" />
				</Button>
				<Button className="m-1" onClick={onClose}>
					<Trans id="cancel" />
				</Button>
				<Button variant="warning" className="m-1" onClick={() => onSubmit("")}>
					<Trans id="delete-nickname-button" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
