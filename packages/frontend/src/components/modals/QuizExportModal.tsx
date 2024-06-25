import { Trans } from "@lingui/react";
import { useEffect, useRef } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";

interface Props {
	show: boolean;
	filename?: string;
	onClose: () => void;
	onDownload: (filename: string) => void;
}

export const QuizExportModal: React.FC<Props> = ({ show, filename, onClose, onDownload }) => {
	const submitButtonRef = useRef<HTMLButtonElement>(null);

	const handleClose = () => {
		onClose();
	};

	useEffect(() => {
		if (filename) {
			submitButtonRef.current?.focus();
		}
	}, [filename]);

	return (
		<Modal show={show} dialogClassName="modal-80w" onEscapeKeyDown={handleClose}>
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<div style={{ minWidth: "80vw" }}>
					<Trans id="quiz-export-modal-title" />
				</div>
			</Modal.Title>
			<Modal.Body>
				<div className="d-flex flex-column flex-grow-1">
					{!filename && (
						<div className="d-flex flex-row align-items-center">
							<Spinner animation="border" role="status" className="me-2">
								{" "}
							</Spinner>
							<Trans id="quiz-export-modal-text-pending" />
						</div>
					)}
					{!!filename && <Trans id="quiz-export-modal-text-ready" />}
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button variant="outline-primary" className="m-1" onClick={handleClose}>
					<Trans id="cancel" />
				</Button>
				<Button
					ref={submitButtonRef}
					className="m-1"
					disabled={!filename}
					onClick={() => {
						!!filename && onDownload(filename);
					}}
				>
					<Trans id="download-csv" />
				</Button>
				<Button
					ref={submitButtonRef}
					className="m-1"
					disabled={!filename}
					onClick={() => {
						!!filename && onDownload(filename.replace("csv", "pdf"));
					}}
				>
					<Trans id="download-pdf" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
