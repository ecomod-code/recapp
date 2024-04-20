import { useState } from "react";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { User, UserRole } from "@recapp/models";

const LABEL_MIN_WIDTH = 140;

interface Props {
    user: User;
    ownRole: UserRole;
    isOwnAccount: boolean;
    show: boolean;
    onClose: () => void;
    onSubmit: ({ username, role, active }: Pick<User, "username" | "role" | "active">) => void;
}

export const EditUserModal = ({ user, ownRole, isOwnAccount, show, onClose, onSubmit }: Props) => {
    const [username, setUserName] = useState(user.username);
    const [role, setRole] = useState(user.role);
    const [active, setActive] = useState(!!user.active);

    return (
        <Modal show={show} contentClassName="overflow-hidden">
            <Modal.Title className="p-3 ps-3 text-bg-primary">
                <Trans id="edit-user-modal.modal-title" />
            </Modal.Title>

            <Modal.Body>
                <Form.Group className="d-flex mt-2 align-items-center">
                    <Form.Label style={{ minWidth: LABEL_MIN_WIDTH }}>
                        <Trans id="edit-user-modal.input-label.user-name" />
                    </Form.Label>
                    <Form.Control value={username} onChange={event => setUserName(event.target.value)} />
                </Form.Group>

                <Form.Group className="d-flex mt-2 align-items-center">
                    <Form.Label style={{ minWidth: LABEL_MIN_WIDTH }}>
                        <Trans id="edit-user-modal.input-label.user-role" />
                    </Form.Label>
                    <Form.Select
                        disabled={isOwnAccount}
                        value={role}
                        onChange={e => setRole(e.target.value as UserRole)}
                    >
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
                </Form.Group>

                <Form.Group className="d-flex mt-2">
                    <Form.Label style={{ minWidth: LABEL_MIN_WIDTH }}>
                        <Trans id="edit-user-modal.input-label.user-status" />
                    </Form.Label>
                    <Form.Switch
                        disabled={isOwnAccount}
                        className="list-group-item ps-5"
                        checked={active}
                        onChange={() => setActive(prev => !prev)}
                    />
                </Form.Group>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="outline-primary" onClick={onClose}>
                    <Trans id="cancel" />
                </Button>

                <Button onClick={() => onSubmit({ username, role, active })}>
                    <Trans id="okay" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
