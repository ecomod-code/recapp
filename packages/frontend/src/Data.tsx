import { User } from "@recapp/models";
import { useStatefulActor } from "ts-actors-react";
import { i18n } from "@lingui/core";
import { maybe } from "tsmonads";
import { Badge, Card, Container, Row } from "react-bootstrap";
import { fromTimestamp } from "itu-utils";
import { CheckCircleFill, CircleFill } from "react-bootstrap-icons";

const UserCard: React.FC<{ user: User }> = ({ user }) => {
	return (
		<Card className="p-0 m-1" style={{ width: "16rem" }}>
			<Card.Title className="p-1 text-bg-primary" style={{ background: "darkGrey" }}>
				{user.username}
			</Card.Title>
			<Card.Body>
				<Card.Text className="text-start">
					<div className="d-flex flex-row align-items-center">
						<div className="d-flex flex-row align-items-center flex-fill">
							<div>
								{user.active ? (
									<CheckCircleFill color="green" size="1.5rem" style={{ paddingBottom: 4 }} />
								) : (
									<CircleFill color="grey" size="1.5rem" style={{ paddingBottom: 4 }} />
								)}
							</div>
							<div>&nbsp;{user.uid}</div>
						</div>
						<div>
							<Badge bg={user.role === "ADMIN" ? "success" : "light"}>Admin</Badge>
						</div>
					</div>
				</Card.Text>
			</Card.Body>
			<Card.Footer className="w-100">
				<div>Letzter Login: {fromTimestamp(user.lastLogin).toLocaleString()}</div>
			</Card.Footer>
		</Card>
	);
};

export const Data: React.FC = () => {
	const [localUser] = useStatefulActor<{ user: User }>("LocalUser");
	const [userList] = useStatefulActor<{ users: User[] }>("UserAdmin");
	let users: User[] = userList.map(ul => ul.users).orElse([] as User[]);
	users = [...users, ...users, ...users, ...users, ...users, ...users];
	const response = i18n._("dashboard.greet-user") + " " + localUser.flatMap(s => maybe(s.user?.username)).orElse("");
	return (
		<Container>
			<Row>{response}</Row>
			<div className="d-flex flex-wrap">
				{users.map((user: User) => (
					<UserCard key={user.uid} user={user} />
				))}
			</div>
		</Container>
	);
};
