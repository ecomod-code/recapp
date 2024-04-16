import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";

interface Props {
	show: boolean;
	showDelete: boolean;
	onClose: () => void;
	onSubmit: () => void;
	onDelete: () => void;
}

export const ArchiveQuizModal: React.FC<Props> = ({ show, showDelete, onClose, onSubmit, onDelete }) => {
	return (
		<Modal show={show} dialogClassName="modal-80w">
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
				<Button
					className="m-1"
					onClick={() => {
						onSubmit();
					}}
				>
					<Trans id="archive-quiz-button" />
				</Button>
				{showDelete && (
					<Button
						className="m-1"
						variant="danger"
						onClick={() => {
							onDelete();
						}}
					>
						<Trans id="delete-quiz-button" />
					</Button>
				)}
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
