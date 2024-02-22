import { User } from "@recapp/models";
import { useStatefulActor } from "./hooks/useStatefulActor";
import { i18n } from "@lingui/core";
import { maybe } from "tsmonads";
import { Container, Row, Table } from "react-bootstrap";

export const Data: React.FC = () => {
	const [localUser] = useStatefulActor<{ user: User }>("LocalUser", "DATA");
	const [userList] = useStatefulActor<{ users: User[] }>("UserAdmin", "DATA");
	const users: User[] = userList.map(ul => ul.users).orElse([] as User[]);
	const response = i18n._("dashboard.greet-user") + " " + localUser.flatMap(s => maybe(s.user?.username)).orElse("");
	return (
		<Container>
			<Row>{response}</Row>
			<Table striped bordered hover>
				<thead>
					<tr>
						<th>Login</th>
						<th>Name</th>
						<th>Rolle</th>
						<th>Aktiv</th>
					</tr>
				</thead>
				<tbody>
					{users.map((user: User) => (
						<tr key={user.uid}>
							<td>{user.uid}</td>
							<td>{user.username}</td>
							<td>{user.role}</td>
							<td>{user.active ? "JA" : "NEIN"}</td>
						</tr>
					))}
				</tbody>
			</Table>
		</Container>
	);
};
