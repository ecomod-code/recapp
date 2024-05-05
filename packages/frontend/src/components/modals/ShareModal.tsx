import React from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import QrCode from "qrcode.react";
import { Trans } from "@lingui/react";

interface Props {
    quizLink: string;
    onClose: () => void;
}

export const ShareModal: React.FC<Props> = ({ quizLink, onClose }) => {
    const ql = `${import.meta.env.VITE_FRONTEND_URI}${quizLink}`;

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal show={!!quizLink} centered size="xl" onEscapeKeyDown={handleClose}>
            <Modal.Title className="p-1 ps-2 text-bg-primary">
                <div>
                    <Trans id="share-qr-code-header" />
                </div>
            </Modal.Title>
            <Modal.Body>
                <div className="d-flex flex-column flex-grow-1 align-items-center">
                    <QrCode level="H" value={ql} style={{ height: "60%", width: "60%" }} renderAs="svg" />

                    <div className="mt-4">
                        <a href={ql}>{ql}</a>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="primary" className="m-1" onClick={handleClose}>
                    <Trans id="close" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
