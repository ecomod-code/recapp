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
                onSubmit={onSubmit}
            />

            <Card className="p-0 m-1" style={{ width: "16rem" }}>
                <Card.Title className="p-1 ps-2 text-bg-primary text-start">
                    <div className="d-flex align-items-center">
                        <p
                            className="flex-grow-1 m-0"
                            style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                        >
                            {user.username}
                        </p>
                        <ButtonWithTooltip title={i18n._("user-card.button-tooltip.edit")} className="m-0">
                            <Pencil height="1rem" onClick={() => setIsModalVisible(true)} />
                        </ButtonWithTooltip>
                    </div>
                </Card.Title>
                <Card.Body>
                    <Card.Text as="div" className="text-start">
                        <div className="d-flex flex-row align-items-center mb-2">
                            <div className="d-flex flex-row align-items-center flex-fill">
                                <UserActive active={user.active} />
                                <div>&nbsp;{user.uid}</div>
                            </div>
                            <RoleBadge role={user.role} />
                        </div>
                        <div className="fst-italic">{user.nickname ? `aka ${user.nickname}` : " "}</div>
                    </Card.Text>
                </Card.Body>
                <Card.Footer className="w-100">
                    <div className="text-start">
                        {i18n._({
                            id: "user-last-login: {date}",
                            values: { date: fromTimestamp(user.lastLogin ?? toTimestamp()).toLocaleString() },
                        })}
                    </div>
                </Card.Footer>
            </Card>
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
