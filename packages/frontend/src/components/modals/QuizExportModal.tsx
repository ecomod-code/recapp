import { Trans } from "@lingui/react";
import { Button, Modal, Spinner } from "react-bootstrap";

interface Props {
	show: boolean;
	filename?: string;
	onClose: () => void;
	onDownload: (filename: string) => void;
}

export const QuizExportModal: React.FC<Props> = ({ show, filename, onClose, onDownload }) => {
	return (
		<Modal show={show} dialogClassName="modal-80w">
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
				<Button
					className="m-1"
					disabled={!filename}
					onClick={() => {
						!!filename && onDownload(filename);
					}}
				>
					<Trans id="download" />
				</Button>
				<Button
					className="m-1"
					onClick={() => {
						onClose();
					}}
				>
					<Trans id="cancel" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
