import { Container, Dropdown, Nav, Navbar, Form, InputGroup } from "react-bootstrap";
import { useStatefulActor } from "ts-actors-react";
import { User, UserStoreMessages } from "@recapp/models";
import { LocaleSelect } from "../components/layout/LocaleSelect";
import { Trans } from "@lingui/react";
import { BoxArrowRight, Pencil } from "react-bootstrap-icons";
import { InitialsBubble } from "../components/InitialsBubble";
import React, { PropsWithChildren, useState } from "react";
import { ChangeNicknameModal } from "../components/modals/ChangeNicknameModal";
import { actorUris } from "../actorUris";

export const HEADER_HEIGHT = 40;

const CustomToggle = React.forwardRef<HTMLAnchorElement, PropsWithChildren & { onClick: (e: unknown) => void }>(
	({ children, onClick }, ref) => (
		<a
			href=""
			ref={ref}
			onClick={e => {
				e.preventDefault();
				onClick(e);
			}}
		>
			{children}
		</a>
	)
);

export const HeaderSection: React.FC = () => {
	const [nameModal, setNameModal] = useState(false);
	const [data, actor] = useStatefulActor<{ user: User }>("LocalUser");

	return data
		.map(d => d.user)
		.match(
			user => {
				const nickname = user?.nickname ?? "Nicht gesetzt";
				const role = `(${user.role})`;
				const changeName = (nickname: string) => {
					actor.forEach(a =>
						a.send(actorUris.UserStore, UserStoreMessages.UpdateUser({ uid: user.uid, nickname }))
					);
					setNameModal(false);
				};
				return (
					<header>
						<ChangeNicknameModal
							show={nameModal}
							defaultValue={user.nickname ?? ""}
							onClose={() => setNameModal(false)}
							onSubmit={changeName}
						/>
						<Navbar className="bg-body-tertiary" sticky="top">
							<Container fluid>
								<Navbar.Brand href="#">RECAPP</Navbar.Brand>
								<Nav className="justify-content-end flex-grow-1 pe-3">
									<Dropdown align="end" style={{ minWidth: 36 }} autoClose="outside">
										<Dropdown.Toggle as={CustomToggle} variant="light">
											<InitialsBubble username={user.username} />
										</Dropdown.Toggle>

										<Dropdown.Menu style={{ minWidth: 300 }}>
											<Dropdown.Header className="fs-6">
												<span className="fw-bold">{user.username}</span>&nbsp;{role}
											</Dropdown.Header>
											<Dropdown.Item onClick={() => setNameModal(true)}>
												<InputGroup className="mb-1">
													<InputGroup.Text>Pseudonym</InputGroup.Text>
													<Form.Control disabled value={nickname} />
													<InputGroup.Text onClick={() => setNameModal(true)}>
														<Pencil className="mt-1" />
													</InputGroup.Text>
												</InputGroup>
											</Dropdown.Item>
											<Dropdown.Item>
												<LocaleSelect />
											</Dropdown.Item>
											<Dropdown.Divider></Dropdown.Divider>
											<Dropdown.Item href={`${import.meta.env.VITE_BACKEND_URI}/auth/logout`}>
												<BoxArrowRight size={24} />
												&nbsp;
												<Trans id="header.logout" />
											</Dropdown.Item>
										</Dropdown.Menu>
									</Dropdown>
								</Nav>
							</Container>
						</Navbar>
					</header>
				);
			},
			() => null
		);
};
