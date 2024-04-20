import { useState } from "react";
import { User, UserRole, UserStoreMessages } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { i18n } from "@lingui/core";
import { Maybe } from "tsmonads";
import { fromTimestamp, toTimestamp } from "itu-utils";

import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import { CheckCircleFill, CircleFill, Pencil } from "react-bootstrap-icons";
import { EditUserModal } from "../modals/EditUserModal";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { actorUris } from "../../actorUris";
// import { ChangeNameModal } from "../modals/ChangeNameModal";
// import { ChangeActiveModal } from "../modals/ChangeActiveModal";
// import { ChangeRoleModal } from "../modals/ChangeRoleModal";

interface Props {
    user: User;
    ownUser: Maybe<User>;
}

export const UserCard = ({ user, ownUser }: Props) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [, actor] = useStatefulActor<{ users: User[] }>("UserAdmin");

    const close = () => {
        setIsModalVisible(false);
    };

    const onSubmit = ({ username, role, active }: Pick<User, "username" | "role" | "active">) => {
        actor.forEach(a =>
            a.send(actorUris.UserStore, UserStoreMessages.Update({ uid: user.uid, username, role, active }))
        );

        setIsModalVisible(false);
    };

    return (
        <>
            <EditUserModal //
                show={isModalVisible}
                user={user}
                onClose={close}
                ownRole={ownUser.map(o => o.role).orElse("STUDENT")}
                isOwnAccount={ownUser.map(o => o.uid === user.uid).orElse(false)}
                onSubmit={onSubmit}
            />

            <div className="position-relative">
                <div style={{ position: "absolute", top: -18, left: 2, fontSize: 12, color: "grey" }}>
                    {i18n._({
                        id: "user-last-login: {date}",
                        values: {
                            date: fromTimestamp(user.lastLogin ?? toTimestamp()).toLocaleString({
                                dateStyle: "medium",
                                timeStyle: "medium",
                            }),
                        },
                    })}
                </div>
                <Card className="overflow-hidden">
                    <Card.Title className="p-3 ps-2 text-bg-primary">
                        <p className="text-overflow-ellipsis m-0">{user.username}</p>
                    </Card.Title>

                    <Card.Body className="d-flex flex-column justify-content-between">
                        <div className="mb-2 d-flex">
                            <UserActive active={user.active} />
                            <span>&nbsp;{user.uid}</span>
                        </div>

                        <div className="fst-italic mb-2">{user.nickname ? `aka ${user.nickname}` : " "}</div>

                        <div>
                            <RoleBadge role={user.role} />
                        </div>
                    </Card.Body>

                    <Card.Footer className="d-flex justify-content-end">
                        <ButtonWithTooltip
                            title={i18n._("user-card.button-tooltip.edit")}
                            className="m-0"
                            onClick={() => setIsModalVisible(true)}
                        >
                            <Pencil height="1rem" />
                        </ButtonWithTooltip>
                    </Card.Footer>
                </Card>
            </div>
        </>
    );
};

const UserActive = (props: { active: boolean }) => {
    return (
        <div>
            {props.active ? (
                <CheckCircleFill color="green" size="1.5rem" style={{ paddingBottom: 4 }} />
            ) : (
                <CircleFill color="grey" size="1.5rem" style={{ paddingBottom: 4 }} />
            )}
        </div>
    );
};

const RoleBadge = (props: { role: UserRole }) => {
    const roleProps: Record<UserRole, { color: "success" | "info" | "dark"; name: string }> = {
        ADMIN: {
            color: "success",
            name: i18n._("role-name-admin"),
        },
        TEACHER: {
            color: "info",
            name: i18n._("role-name-teacher"),
        },
        STUDENT: {
            color: "dark",
            name: i18n._("role-name-student"),
        },
    };

    const { color, name } = roleProps[props.role];
    return (
        <Badge as="div" bg={color}>
            {name}
        </Badge>
    );
};
