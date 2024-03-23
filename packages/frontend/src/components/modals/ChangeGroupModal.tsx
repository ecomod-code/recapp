import { useEffect, useState } from "react";
import { Trans } from "@lingui/react";
import { Button, Modal, Form } from "react-bootstrap";
import { head } from "rambda";

interface Props {
	show: boolean;
	currentGroup: string;
	groups: string[];
	onClose: () => void;
	onSubmit: (newGroup: string) => void;
}

export const ChangeGroupModal: React.FC<Props> = ({ show, currentGroup, groups, onClose, onSubmit }) => {
	const [group, setGroup] = useState(currentGroup);

	useEffect(() => {
		setGroup(head(groups.filter(g => g !== currentGroup)));
	}, [currentGroup]);

	return (
		<Modal show={show}>
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<Trans id="change-group-of-question-title" />
			</Modal.Title>
			<Modal.Body>
				<Form.Select value={group} onChange={e => setGroup(e.target.value)}>
					{groups
						.filter(g => g !== currentGroup)
						.map(g => (
							<option key={g} value={g}>
								{g}
							</option>
						))}
				</Form.Select>
			</Modal.Body>
			<Modal.Footer>
				<Button className="m-1" onClick={() => onSubmit(group)}>
					<Trans id="change-group" />
				</Button>
				<Button className="m-1" onClick={onClose}>
					<Trans id="cancel" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
