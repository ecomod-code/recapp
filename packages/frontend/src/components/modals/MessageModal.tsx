import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";

interface Props {
	show: boolean;
	titleId: string;
	textId: string;
	color?: string;
	onClose: () => void;
}

export const MessageModal: React.FC<Props> = ({ show, titleId, textId, onClose, color }) => {
	return (
		<Modal show={show} dialogClassName="modal-80w" contentClassName="overflow-hidden">
			<Modal.Title className="p-3 text-bg-primary">
				<div style={{ minWidth: "80vw", color }}>
					<Trans id={titleId} />
				</div>
			</Modal.Title>
			<Modal.Body>
				<div className="d-flex flex-column flex-grow-1" style={{ color }}>
					<Trans id={textId} />
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button
					className="m-1"
					onClick={() => {
						onClose();
					}}
				>
					<Trans id="okay" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
