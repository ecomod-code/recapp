import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

interface Props {
    show: boolean;
    showDelete: boolean;
    onClose: () => void;
    onSubmit: () => void;
    onDelete: () => void;
}

export const ArchiveQuizModal: React.FC<Props> = ({ show, showDelete, onClose, onSubmit, onDelete }) => {
    const handleClose = () => {
        onClose();
    };

    return (
        <Modal show={show} dialogClassName="modal-80w" onEscapeKeyDown={handleClose}>
            <Modal.Title className="p-1 ps-2 text-bg-primary">
                <div style={{ minWidth: "80vw" }}>
                    <Trans id="archive-quiz-title" />
                </div>
            </Modal.Title>

            <Modal.Body>
                <div className="d-flex flex-column flex-grow-1">
                    <Trans id="archive-quiz-text" />
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="outline-primary" className="m-1" onClick={handleClose}>
                    <Trans id="cancel" />
                </Button>
                {showDelete && (
                    <Button variant="danger" className="m-1" onClick={onDelete}>
                        <Trans id="delete-quiz-button" />
                    </Button>
                )}
                <Button className="m-1" onClick={onSubmit}>
                    <Trans id="archive-quiz-button" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
