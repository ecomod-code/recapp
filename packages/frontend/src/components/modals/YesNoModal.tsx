import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";

interface Props {
	show: boolean;
	titleId: string;
	textId: string;
	onClose: () => void;
	onSubmit: () => void;
}

export const YesNoModal: React.FC<Props> = ({ show, titleId, textId, onClose, onSubmit }) => {
	return (
		<Modal show={show} dialogClassName="modal-80w">
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
					className="m-1"
					onClick={() => {
						onSubmit();
					}}
				>
					<Trans id="okay" />
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
