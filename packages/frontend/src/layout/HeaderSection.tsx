import { PropsWithChildren, forwardRef, useState } from "react";
import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { useStatefulActor } from "ts-actors-react";
import { keys } from "rambda";
import { maybe, nothing } from "tsmonads";
import { User, UserStoreMessages } from "@recapp/models";

import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { BoxArrowRight, Pencil } from "react-bootstrap-icons";
import { LocaleSelect } from "../components/layout/LocaleSelect";
import { PaletteSelect } from "../components/layout/PaletteSelect";
import { InitialsBubble } from "../components/InitialsBubble";
import { ChangeNicknameModal } from "../components/modals/ChangeNicknameModal";
import { ErrorModal } from "../components/modals/ErrorModal";
import { TooltipWrapper } from "../components/TooltipWrapper";
import { actorUris } from "../actorUris";
import { CurrentQuizState } from "../actors/CurrentQuizActor";

export const HEADER_HEIGHT = 40;

// eslint-disable-next-line react/display-name
const CustomToggle = forwardRef<HTMLAnchorElement, PropsWithChildren & { onClick: (e: unknown) => void }>(
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
    const [mbQuiz] = useStatefulActor<CurrentQuizState>("CurrentQuiz");

    const quizData = mbQuiz
        .flatMap(q => (keys(q.quiz).length > 0 ? maybe(q) : nothing()))
        .match(
            quizData => quizData,
            () => null
        );

	return data
		.map(d => d.user)
		.match(
			user => {
				const nickname = user?.nickname ?? i18n._("nickname-not-set");
				const role = user.role === "ADMIN" ? `(${user.role})` : "";
				const changeName = (nickname: string) => {
					actor.forEach(a =>
						a.send(
							actorUris.UserStore,
							UserStoreMessages.Update({
								uid: user.uid,
								nickname,
							})
						)
					);
					setNameModal(false);
				};
				return (
					<header>
						<ErrorModal />
						<ChangeNicknameModal
							show={nameModal}
							defaultValue={user.nickname ?? ""}
							onClose={() => setNameModal(false)}
							onSubmit={changeName}
						/>
						<Navbar className="bg-body-tertiary" sticky="top">
							<Container>
								<Navbar.Brand href="#">RECAPP</Navbar.Brand>

                                {!quizData?.isPresentationModeActive ? (
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
                                                        <TooltipWrapper
                                                            title={i18n._(
                                                                "header-section.button-tooltip.edit-or-add-pseudonym"
                                                            )}
                                                        >
                                                            <InputGroup.Text onClick={() => setNameModal(true)}>
                                                                <Pencil className="mt-1" />
                                                            </InputGroup.Text>
                                                        </TooltipWrapper>
                                                    </InputGroup>
                                                </Dropdown.Item>
                                                <Dropdown.Item>
                                                    <LocaleSelect />
                                                </Dropdown.Item>
                                                <Dropdown.Item>
                                                   <PaletteSelect /> 
                                                </Dropdown.Item>
                                                <Dropdown.Divider></Dropdown.Divider>
                                                <Dropdown.Item href={`${import.meta.env.VITE_BACKEND_URI}/auth/logout`}>
                                                    <TooltipWrapper
                                                        title={i18n._("header-section.button-tooltip.logout")}
                                                    >
                                                        <BoxArrowRight size={24} />
                                                    </TooltipWrapper>
                                                    &nbsp;
                                                    <Trans id="header.logout" />
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>
                                    </Nav>
                                ) : null}
							</Container>
						</Navbar>
					</header>
				);
			},
			() => null
		);
};
