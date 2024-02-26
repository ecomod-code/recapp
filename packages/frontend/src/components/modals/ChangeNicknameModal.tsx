import { useState } from "react";
import { Trans } from "@lingui/react";
import { Button, Modal, Form } from "react-bootstrap";

interface Props {
	show: boolean;
	defaultValue: string;
	onClose: () => void;
	onSubmit: (name: string) => void;
}

export const ChangeNicknameModal: React.FC<Props> = ({ show, defaultValue, onClose, onSubmit }) => {
	const [name, setName] = useState(defaultValue);

	return (
		<Modal show={show}>
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<Trans id="user-change-nickname-modal-title" />
			</Modal.Title>
			<Modal.Body>
				<Form.Control
					defaultValue={defaultValue}
					value={name}
					onChange={event => setName(event.target.value)}
				/>
			</Modal.Body>
			<Modal.Footer>
				<Button className="m-1" onClick={() => onSubmit(name)}>
					<Trans id="okay" />
				</Button>
				<Button className="m-1" onClick={onClose}>
					<Trans id="cancel" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
