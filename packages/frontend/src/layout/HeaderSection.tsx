import { Container, Navbar, Offcanvas, NavDropdown, Nav, Button, Form } from "react-bootstrap";
import { useStatefulActor } from "../hooks/useStatefulActor";
import { User } from "@recapp/models";
import { maybe } from "tsmonads";
import { LocaleSelect } from "../components/layout/LocaleSelect";
import { Trans } from "@lingui/react";

export const HEADER_HEIGHT = 40;

export const HeaderSection = () => {
	const [data] = useStatefulActor<{ user: User }>("LocalUser", "HEADER");
	const username = data.flatMap(d => maybe(d.user?.username)).orElse("");
	const role = data
		.flatMap(d => maybe(d.user?.role))
		.map(role => `(${role})`)
		.orElse("");
	const initials = username ? (username[0] + username[username.lastIndexOf(" ") + 1]).toUpperCase() : "";
	const expand = "md";
	// if (!document.cookie.includes("bearer")) return null;
	return (
		<header>
			<Navbar className="bg-body-tertiary" sticky="top" expand={expand}>
				<Container fluid>
					<Navbar.Brand href="#">RECAPP</Navbar.Brand>
					<Navbar.Toggle aria-controls={`offcanvasNavbar-expand-${expand}`} />
					<Navbar.Offcanvas
						id={`offcanvasNavbar-expand-${expand}`}
						aria-labelledby={`offcanvasNavbarLabel-expand-${expand}`}
						placement="end"
					>
						<Offcanvas.Body>
							<Nav className="justify-content-end flex-grow-1 pe-3">
								<div style={{ display: "flex", flexDirection: "row" }}>
									<div
										style={{
											height: 36,
											width: 36,
											fontWeight: "bold",
											padding: 4,
											fontSize: 18,
											background: "blue",
											color: "white",
											borderRadius: 18,
											display: "flex",
											flexDirection: "row",
											justifyContent: "center",
											alignContent: "center",
											marginRight: 8,
										}}
									>
										{initials}
									</div>
									<div
										style={{
											marginRight: 24,
											display: "flex",
											flexDirection: "row",
											height: 36,
										}}
									>
										<div style={{ alignSelf: "center", justifySelf: "center" }}>
											{username} {role}
										</div>
									</div>
								</div>
								&nbsp;
								<Button variant="secondary" href="http://localhost:3123/auth/logout">
									<Trans id="header.logout" />
								</Button>
								&nbsp;
								<LocaleSelect />
							</Nav>
						</Offcanvas.Body>
					</Navbar.Offcanvas>
				</Container>
			</Navbar>
		</header>
	);
};
