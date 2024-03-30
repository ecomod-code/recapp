import React from "react";
import { Button, Modal } from "react-bootstrap";
import QrCode from "qrcode.react";

interface Props {
	quizLink: string;
	onClose: () => void;
}

export const ShareModal: React.FC<Props> = ({ quizLink, onClose }) => {
	const ql = `${import.meta.env.VITE_FRONTEND_URI}${quizLink}`;
	return (
		<Modal show={!!quizLink} centered size="xl">
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<div>Studierende können sich jetzt über Code oder Link in das Quiz einschreiben</div>
			</Modal.Title>
			<Modal.Body>
				<div className="d-flex flex-column flex-grow-1 align-items-center">
					<QrCode level="H" value={ql} style={{ height: "80%", width: "80%" }} renderAs="svg" />
					<div className="mt-4">
						<a href={ql}>{ql}</a>
					</div>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button
					variant="primary"
					className="m-1"
					onClick={() => {
						onClose();
					}}
				>
					Schließen
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
