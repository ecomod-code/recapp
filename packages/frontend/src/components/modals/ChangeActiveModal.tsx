import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

interface Props {
    show: boolean;
    active: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

export const ChangeActiveModal: React.FC<Props> = ({ show, active, onClose, onSubmit }) => {
    const handleClose = () => {
        onClose();
    };

    return (
        <Modal show={show} onEscapeKeyDown={handleClose}>
            <Modal.Title className="p-1 ps-2 text-bg-primary">
                {active ? i18n._("user-deactivate-user-button") : i18n._("user-activate-user-button")}
            </Modal.Title>
            <Modal.Body>
                <Trans id="user-change-active-flag-modal-title" />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="outline-primary" className="m-1" onClick={handleClose}>
                    <Trans id="no" />
                </Button>
                <Button autoFocus className="m-1" onClick={onSubmit}>
                    <Trans id="yes" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
