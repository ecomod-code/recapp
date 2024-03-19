import { Trans } from "@lingui/react";
import { Button, Form, Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import "katex/dist/katex.css";

interface Props {
	show: boolean;
	titleId: string;
	editorValue: string;
	onClose: () => void;
	onSubmit: (text: string) => void;
}

export const TextModal: React.FC<Props> = ({ show, titleId, editorValue, onClose, onSubmit }) => {
	const [value, setValue] = useState<string>(editorValue);
	useEffect(() => {
		setValue(editorValue);
	}, [editorValue]);

	return (
		<Modal show={show} dialogClassName="modal-80w">
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<div style={{ minWidth: "80vw" }}>
					<Trans id={titleId} />
				</div>
			</Modal.Title>
			<Modal.Body>
				<div className="d-flex flex-column flex-grow-1">
					<Form.Control value={value} onChange={e => setValue(e.target.value)} />
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button
					className="m-1"
					onClick={() => {
						const v = value;
						setValue("");
						onSubmit(v);
					}}
				>
					<Trans id="okay" />
				</Button>
				<Button
					className="m-1"
					onClick={() => {
						setValue("");
						onClose();
					}}
				>
					<Trans id="cancel" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
