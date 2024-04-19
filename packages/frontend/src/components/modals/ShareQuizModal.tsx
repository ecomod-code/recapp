import { useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import { useStatefulActor } from "ts-actors-react";
import { Quiz } from "@recapp/models";

import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import { Trash } from "react-bootstrap-icons";
import { SharingMessages, SharingState } from "../../actors/SharingActor";
import { Trans } from "@lingui/react";
import { ButtonWithTooltip } from "../ButtonWithTooltip";

interface Props {
	quiz: Quiz;
	show: boolean;
	onClose: () => void;
}

export const ShareQuizModal: React.FC<Props> = ({ quiz, show, onClose }) => {
	const [name, setName] = useState("");
	const [mbShare, tryActor] = useStatefulActor<SharingState>("QuizSharing");
	const add = () => {
		tryActor.forEach(actor => actor.send(actor, SharingMessages.AddEntry(name)));
		setName("");
	};

	const share = () => {
		tryActor.forEach(actor => actor.send(actor, SharingMessages.Share(quiz)));
		setName("");
		onClose();
	};

	const cancel = () => {
		setName("");
		onClose();
	};

	const clear = () => {
		tryActor.forEach(actor => actor.send(actor, SharingMessages.Clear()));
	};

	return mbShare
		.map(s => s.teachers)
		.match(
			teachers => {
				return (
					<Modal show={show}>
						<Modal.Title className="p-1 ps-2 text-bg-primary">
							<Trans id="share-with-teachers-modal-title" />
						</Modal.Title>
						<Modal.Body>
							<div className="mb-2 mt-2" style={{ minHeight: 48 }}>
								<div style={{ position: "absolute", right: 8 }}>
									<ButtonWithTooltip
										title={i18n._("share-quiz-modal.button-tooltip.clear")}
										className="me-2"
										variant="warning"
										onClick={clear}
									>
										<Trash />
									</ButtonWithTooltip>
								</div>
								{teachers.length === 0 && (
									<span style={{ color: "lightgray" }}>
										<Trans id="share-with-teachers-persons-to-add" />
									</span>
								)}
								{teachers.map(t => {
									return (
										<div key={t.query} style={{ color: t.uid ? "green" : "red" }}>
											{t.query}
										</div>
									);
								})}
							</div>
							<Form.Control
								value={name}
								placeholder="ID, Email oder Pseudonym"
								onChange={event => {
									const name = event.target.value;
									setName(name);
								}}
							/>
							<Button variant="primary" onClick={add} className="mt-4">
								<Trans id="share-quiz-modal.button-label.add" />
							</Button>
						</Modal.Body>
						<Modal.Footer>
							<Button variant="primary" onClick={share}>
								<Trans id="share-with-confirmed-users" />
							</Button>
							<Button variant="warning" onClick={cancel}>
								<Trans id="cancel" />
							</Button>
						</Modal.Footer>
					</Modal>
				);
			},
			() => null
		);
};
