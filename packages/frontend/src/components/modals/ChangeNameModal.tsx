import { FormEventHandler, useState } from "react";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";

interface Props {
    show: boolean;
    defaultValue: string;
    onClose: () => void;
    onSubmit: (name: string) => void;
}

export const ChangeNameModal: React.FC<Props> = ({ show, defaultValue, onClose, onSubmit }) => {
    const [name, setName] = useState(defaultValue);

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault();

        onSubmit(name);
    };

    const handleClose = () => {
        setName(defaultValue);
        onClose();
    };

    return (
        <Modal show={show} onEscapeKeyDown={handleClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Title className="p-1 ps-2 text-bg-primary">
                    <Trans id="user-change-username-modal-title" />
                </Modal.Title>
                <Modal.Body>
                    <Form.Control autoFocus value={name} onChange={event => setName(event.target.value)} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-primary" className="m-1" onClick={handleClose}>
                        <Trans id="cancel" />
                    </Button>
                    <Button className="m-1" type="submit">
                        <Trans id="okay" />
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
