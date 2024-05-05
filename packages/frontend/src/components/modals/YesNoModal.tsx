// import { useRef } from "react";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
// import Form from "react-bootstrap/Form";

interface Props {
    show: boolean;
    titleId: string;
    textId: string;
    onClose: () => void;
    onSubmit: () => void;
}

export const YesNoModal: React.FC<Props> = ({ show, titleId, textId, onClose, onSubmit }) => {
    // const submitButtonRef = useRef<HTMLButtonElement>(null);

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal show={show} dialogClassName="modal-80w" keyboard={true} onEscapeKeyDown={handleClose}>
            <Modal.Title className="p-1 ps-2 text-bg-primary">
                <div style={{ minWidth: "80vw" }}>
                    <Trans id={titleId} />
                </div>
            </Modal.Title>
            <Modal.Body>
                <div className="d-flex flex-column flex-grow-1">
                    <Trans id={textId} />
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    // ref={submitButtonRef}
                    // onBlur={() => submitButtonRef.current?.focus()}
                    className="m-1"
                    autoFocus
                    onClick={onSubmit}
                >
                    <Trans id="okay" />
                </Button>
                <Button className="m-1" onClick={handleClose}>
                    <Trans id="cancel" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
