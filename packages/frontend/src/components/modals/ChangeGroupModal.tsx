import { FormEventHandler, useEffect, useState } from "react";
import { Trans } from "@lingui/react";
import { head } from "rambda";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";

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

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault();

        onSubmit(group);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal show={show} onEscapeKeyDown={handleClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Title className="p-1 ps-2 text-bg-primary">
                    <Trans id="change-group-of-question-title" />
                </Modal.Title>
                <Modal.Body>
                    <Form.Select autoFocus value={group} onChange={e => setGroup(e.target.value)}>
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
                    <Button variant="outline-primary" className="m-1" onClick={handleClose}>
                        <Trans id="cancel" />
                    </Button>
                    <Button className="m-1" type="submit">
                        <Trans id="change-group" />
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
