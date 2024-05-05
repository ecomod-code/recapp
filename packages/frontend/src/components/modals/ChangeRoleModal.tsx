import { FormEventHandler, useState } from "react";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { UserRole } from "@recapp/models";

interface Props {
    show: boolean;
    currentRole: UserRole;
    ownRole: UserRole;
    onClose: () => void;
    onSubmit: (role: UserRole) => void;
}

export const ChangeRoleModal: React.FC<Props> = ({ show, currentRole, ownRole, onClose, onSubmit }) => {
    const [role, setRole] = useState(currentRole);

    const handleSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault();

        onSubmit(role);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <Modal show={show} onEscapeKeyDown={handleClose}>
            <Form onSubmit={handleSubmit}>
                <Modal.Title className="p-1 ps-2 text-bg-primary">
                    <Trans id="user-set-user-role-modal-title" />
                </Modal.Title>
                <Modal.Body>
                    <Form.Select value={role} onChange={e => setRole(e.target.value as UserRole)}>
                        <option value="STUDENT">
                            <Trans id="role-name-student" />
                        </option>
                        {ownRole !== "STUDENT" && (
                            <option value="TEACHER">
                                <Trans id="role-name-teacher" />
                            </option>
                        )}
                        {ownRole === "ADMIN" && (
                            <option value="ADMIN">
                                <Trans id="role-name-admin" />
                            </option>
                        )}
                    </Form.Select>
                </Modal.Body>
                <Modal.Footer>
                    <Button type="submit" className="m-1">
                        <Trans id="user-set-role" />
                    </Button>
                    <Button className="m-1" onClick={handleClose}>
                        <Trans id="cancel" />
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};
