import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";
import { i18n } from "@lingui/core";

interface Props {
	show: boolean;
	active: boolean;
	onClose: () => void;
	onSubmit: () => void;
}

export const ChangeActiveModal: React.FC<Props> = ({ show, active, onClose, onSubmit }) => {
	return (
		<Modal show={show}>
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				{active ? i18n._("user-deactivate-user-button") : i18n._("user-activate-user-button")}
			</Modal.Title>
			<Modal.Body>
				<Trans id="user-change-active-flag-modal-title" />
			</Modal.Body>
			<Modal.Footer>
				<Button className="m-1" onClick={() => onSubmit()}>
					<Trans id="yes" />
				</Button>
				<Button className="m-1" onClick={onClose}>
					<Trans id="no" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
