import { useState } from "react";
import { User, UserRole, UserStoreMessages } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { i18n } from "@lingui/core";
import { Badge, Card } from "react-bootstrap";
import { fromTimestamp, toTimestamp } from "itu-utils";
import { CheckCircleFill, CircleFill, Pencil } from "react-bootstrap-icons";
import { Maybe } from "tsmonads";
import { actorUris } from "../../actorUris";
import { ChangeNameModal } from "../modals/ChangeNameModal";
import { ChangeActiveModal } from "../modals/ChangeActiveModal";
import { ChangeRoleModal } from "../modals/ChangeRoleModal";

const UserActive: React.FC<{ active: boolean; onClick: () => void }> = ({ active, onClick }) => {
	return (
		<div>
			{active ? (
				<CheckCircleFill onClick={onClick} color="green" size="1.5rem" style={{ paddingBottom: 4 }} />
			) : (
				<CircleFill onClick={onClick} color="grey" size="1.5rem" style={{ paddingBottom: 4 }} />
			)}
		</div>
	);
};

const RoleBadge: React.FC<{ role: UserRole; onClick: () => void }> = ({ role, onClick }) => {
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

	const { color, name } = roleProps[role];
	return (
		<Badge as="div" bg={color} onClick={onClick}>
			{name}
		</Badge>
	);
};

export const UserCard: React.FC<{ user: User; ownUser: Maybe<User> }> = ({ user, ownUser }) => {
	const [modal, setModal] = useState<false | "Name" | "Active" | "Role">(false);
	const [, actor] = useStatefulActor<{ users: User[] }>("UserAdmin");
	const toggleActivate = () => {
		actor.forEach(a =>
			a.send(actorUris.UserStore, UserStoreMessages.Update({ uid: user.uid, active: !user.active }))
		);
		setModal(false);
	};
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

			<Card className="p-0 m-1" style={{ width: "16rem" }}>
				<Card.Title className="p-1 ps-2 text-bg-primary text-start" style={{ background: "darkGrey" }}>
					<div className="d-flex flex-row">
						<div className="flex-grow-1">{user.username}</div>
						<div className="justify-self-end pb-1 ml-1">
							<Pencil height="1rem" onClick={() => setModal("Name")}></Pencil>
						</div>
					</div>
				</Card.Title>
				<Card.Body>
					<Card.Text as="div" className="text-start">
						<div className="d-flex flex-row align-items-center mb-2">
							<div className="d-flex flex-row align-items-center flex-fill">
								<UserActive
									active={user.active}
									onClick={() =>
										user.uid !== ownUser.map(o => o.uid).orElse(user.uid) && setModal("Active")
									}
								/>
								<div>&nbsp;{user.uid}</div>
							</div>
							<RoleBadge
								role={user.role}
								onClick={() =>
									user.uid !== ownUser.map(o => o.uid).orElse(user.uid) && setModal("Role")
								}
							/>
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
