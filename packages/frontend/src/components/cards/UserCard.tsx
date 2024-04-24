import { useState } from "react";
import { User, UserRole, UserStoreMessages } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { i18n } from "@lingui/core";
import { Maybe } from "tsmonads";
import { fromTimestamp, toTimestamp } from "itu-utils";

import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import { CheckCircleFill, CircleFill, Pencil } from "react-bootstrap-icons";
// import { EditUserModal } from "../modals/EditUserModal";
import { actorUris } from "../../actorUris";
import { ChangeNameModal } from "../modals/ChangeNameModal";
import { ChangeActiveModal } from "../modals/ChangeActiveModal";
import { ChangeRoleModal } from "../modals/ChangeRoleModal";
import { ButtonWithTooltip } from "../ButtonWithTooltip";

interface Props {
    user: User;
    ownUser: Maybe<User>;
}

export const UserCard = ({ user, ownUser }: Props) => {
    // const [isModalVisible, setIsModalVisible] = useState(false);
    // const [, actor] = useStatefulActor<{ users: User[] }>("UserAdmin");

    const [modal, setModal] = useState<false | "Name" | "Active" | "Role">(false);
    const [, actor] = useStatefulActor<{ users: User[] }>("UserAdmin");

    const toggleActivate = () => {
        actor.forEach(a =>
            a.send(actorUris.UserStore, UserStoreMessages.Update({ uid: user.uid, active: !user.active }))
        );
        setModal(false);
    };

    // const close = () => {
    //     setIsModalVisible(false);
    // };

    // const onSubmit = ({ username, role, active }: Pick<User, "username" | "role" | "active">) => {
    //     actor.forEach(a =>
    //         a.send(actorUris.UserStore, UserStoreMessages.Update({ uid: user.uid, username, role, active }))
    //     );

    //     setIsModalVisible(false);
    // };

    const changeRole = (role: UserRole) => {
        actor.forEach(a => a.send(actorUris.UserStore, UserStoreMessages.Update({ uid: user.uid, role })));
        setModal(false);
    };
    const changeName = (username: string) => {
        actor.forEach(a => a.send(actorUris.UserStore, UserStoreMessages.Update({ uid: user.uid, username })));
        setModal(false);
    };
    const close = () => {
        setModal(false);
    };

    return (
        <>
            <ChangeNameModal
                show={modal === "Name"}
                defaultValue={user.username}
                onClose={close}
                onSubmit={changeName}
            />
            <ChangeActiveModal
                show={modal === "Active"}
                active={!!user.active}
                onClose={close}
                onSubmit={toggleActivate}
            />
            <ChangeRoleModal
                show={modal === "Role"}
                currentRole={user.role}
                ownRole={ownUser.map(o => o.role).orElse("STUDENT")}
                onClose={close}
                onSubmit={changeRole}
            />
            {/* <EditUserModal //
                show={isModalVisible}
                user={user}
                onClose={close}
                ownRole={ownUser.map(o => o.role).orElse("STUDENT")}
                isOwnAccount={ownUser.map(o => o.uid === user.uid).orElse(false)}
                onSubmit={onSubmit}
            /> */}

            <div className="position-relative">
                <div style={{ position: "absolute", top: -20, left: 2, fontSize: 14, color: "grey" }}>
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
                    <Card.Title className="p-3 ps-2 d-flex justify-content-between align-items-center text-bg-primary">
                        <p className="text-overflow-ellipsis m-0">{user.username}</p>

                        <ButtonWithTooltip
                            title={i18n._("user-card.button-tooltip.edit")}
                            variant="light"
                            className="m-0"
                            onClick={() => setModal("Name")}
                        >
                            <Pencil height="1rem" />
                        </ButtonWithTooltip>
                    </Card.Title>

                    <Card.Body style={{ minHeight: 120 }} className="mb-3 d-flex flex-column justify-content-between">
                        <div className="mb-1 d-flex">
                            <UserActive
                                onClick={() =>
                                    user.uid !== ownUser.map(o => o.uid).orElse(user.uid) && setModal("Active")
                                }
                                active={user.active}
                            />
                            <span>&nbsp;{user.uid}</span>
                        </div>

                        <div className="fst-italic mb-1">{user.nickname ? `aka ${user.nickname}` : " "}</div>

                        <div>
                            <RoleBadge
                                onClick={() =>
                                    user.uid !== ownUser.map(o => o.uid).orElse(user.uid) && setModal("Role")
                                }
                                role={user.role}
                            />
                        </div>
                    </Card.Body>

                    {/* <Card.Footer className="d-flex justify-content-end">
                        <ButtonWithTooltip
                            title={i18n._("user-card.button-tooltip.edit")}
                            className="m-0"
                            onClick={() => setIsModalVisible(true)}
                        >
                            <Pencil height="1rem" />
                        </ButtonWithTooltip>
                    </Card.Footer> */}
                </Card>
            </div>
        </>
    );
};

const UserActive = (props: { active: boolean; onClick: () => void }) => {
    return (
        <div>
            {props.active ? (
                <CheckCircleFill onClick={props.onClick} color="green" size="1.5rem" style={{ paddingBottom: 4 }} />
            ) : (
                <CircleFill onClick={props.onClick} color="grey" size="1.5rem" style={{ paddingBottom: 4 }} />
            )}
        </div>
    );
};

const RoleBadge = (props: { role: UserRole; onClick: () => void }) => {
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
        <Badge as="div" bg={color} onClick={props.onClick}>
            {name}
        </Badge>
    );
};
