import { FormEventHandler, useEffect, useState } from "react";
import "katex/dist/katex.css";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";

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

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault();

        const v = value;
        setValue("");
        onSubmit(v);
    };

    const handleClose = () => {
        setValue("");
        onClose();
    };

    return (
        <Modal show={show} size="lg" onEscapeKeyDown={handleClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Title className="p-1 ps-2 text-bg-primary">
                    <div style={{ minWidth: "80vw" }}>
                        <Trans id={titleId} />
                    </div>
                </Modal.Title>
                <Modal.Body>
                    <div className="d-flex flex-column flex-grow-1">
                        <Form.Control autoFocus value={value} onChange={e => setValue(e.target.value)} />
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-primary" onClick={handleClose}>
                        <Trans id="cancel" />
                    </Button>
                    <Button type="submit">
                        <Trans id="okay" />
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
