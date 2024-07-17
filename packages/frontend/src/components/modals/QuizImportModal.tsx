import { useState } from "react";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import axios from "axios";
import { useStatefulActor } from "ts-actors-react";
import { LocalUserActor, ResetError, UploadQuizMessage } from "../../actors/LocalUserActor";

interface Props {
	show: boolean;
	onClose: () => void;
}

export const QuizImportModal: React.FC<Props> = ({ show, onClose }) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [selectedFile, setSelectedFile] = useState<any>(null);
	const [data, tryActor] = useStatefulActor<{ error: string }>("LocalUser");

	const error = data.map(d => d.error).orElse("");

	const upload = async () => {
		const formData = new FormData();

		formData.append("name", selectedFile.name);
		formData.append("file", selectedFile);

		const result = await axios.post(`${import.meta.env.VITE_BACKEND_URI}/upload`, formData, {
			headers: {
				"Content-Type": "multipart/form-data",
			},
		});
		const filename = result.data;
		tryActor.forEach(actor => actor.send(actor, new UploadQuizMessage(filename)));
		setSelectedFile(null);
		onClose();
	};

	const handleClose = () => {
		tryActor.forEach(actor => actor.send(actor, new ResetError()));
		setSelectedFile(null);
		onClose();
	};

	return (
		<>
			<Modal show={!!error} onEscapeKeyDown={handleClose}>
				<Modal.Title className="p-1 ps-2 text-bg-primary">
					<Trans id="quiz-import-error-title" />
				</Modal.Title>
				<Modal.Body>
					<div className="text-danger">
						<Trans id="quiz-import-error-message" />
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="outline-primary" className="m-1" onClick={handleClose}>
						<Trans id="ok" />
					</Button>
				</Modal.Footer>
			</Modal>

			<Modal show={show} dialogClassName="modal-80w" onEscapeKeyDown={handleClose}>
				<Modal.Title className="p-1 ps-2 text-bg-primary">
					<div style={{ minWidth: "80vw" }}>
						<Trans id="quiz-import-modal-title" />
					</div>
				</Modal.Title>
				<Modal.Body>
					<div className="d-flex flex-column flex-grow-1">
						<Trans id="quiz-import-modal-message" />
						<div>
							<div>
								<input
									type="file"
									accept=".json,application/json"
									onChange={event => {
										setSelectedFile(event?.target?.files?.[0]);
									}}
								/>
							</div>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button variant="outline-primary" className="m-1" onClick={handleClose}>
						<Trans id="cancel" />
					</Button>
					<Button className="m-1" disabled={selectedFile === null} type="submit" onClick={upload}>
						<Trans id="import" />
					</Button>
				</Modal.Footer>
			</Modal>
		</>
	);
};
