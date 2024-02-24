import { Container, Dropdown, Nav, Navbar } from "react-bootstrap";
import { useStatefulActor } from "ts-actors-react";
import { User } from "@recapp/models";
import { maybe } from "tsmonads";
import { LocaleSelect } from "../components/layout/LocaleSelect";
import { Trans } from "@lingui/react";
import { BoxArrowRight } from "react-bootstrap-icons";
import { InitialsBubble } from "../components/InitialsBubble";
import React, { PropsWithChildren } from "react";

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
	const [data] = useStatefulActor<{ user: User }>("LocalUser");
	const username = data.flatMap(d => maybe(d.user?.username)).orElse("");
	const role = data
		.flatMap(d => maybe(d.user?.role))
		.map(role => `(${role})`)
		.orElse("");

	// if (!document.cookie.includes("bearer")) return null;
	return (
		<header>
			<Navbar className="bg-body-tertiary" sticky="top">
				<Container fluid>
					<Navbar.Brand href="#">RECAPP</Navbar.Brand>
					<Nav className="justify-content-end flex-grow-1 pe-3">
						<Dropdown align="end" style={{ minWidth: 36 }} autoClose="outside">
							<Dropdown.Toggle as={CustomToggle} variant="light">
								<InitialsBubble username={username} />
							</Dropdown.Toggle>

							<Dropdown.Menu style={{ minWidth: 300 }}>
								<Dropdown.Header>
									{username}&nbsp;{role}
								</Dropdown.Header>
								<Dropdown.Item>
									<LocaleSelect />
								</Dropdown.Item>
								<Dropdown.Divider></Dropdown.Divider>
								<Dropdown.Item href="http://localhost:3123/auth/logout">
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
};
