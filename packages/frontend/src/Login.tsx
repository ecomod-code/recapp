import { useEffect } from "react";
import { Trans } from "@lingui/react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Modal from "react-bootstrap/Modal";
import { LocaleSelect } from "./components/layout/LocaleSelect";
import { cookie } from "./utils";

export const Login = () => {
    const nav = useNavigate();
    const error = document.location.search.includes("error=userdeactivated");
    useEffect(() => {
        if (cookie("bearer")) {
            nav({ pathname: "/Dashboard" });
        }
    });
    return (
        <>
            <Modal show={error}>
                <Modal.Title className="ps-2 p-1 text-bg-primary">Login-Fehler</Modal.Title>
                <Modal.Body>Ihr Account wurde deaktiviert. Bitte wenden Sie sich an Ihren Administrator.</Modal.Body>
            </Modal>

            <Container style={{ minHeight: "100dvh" }} className="text-center w-100 d-flex flex-column">
                <div className="flex-grow-1" />

                <div>
                    <p className="h1">RECAPP</p>
                    <Button
                        variant="primary"
                        href={`${import.meta.env.VITE_BACKEND_URI}/auth/login`}
                        className="m-4 px-5"
                    >
                        <Trans id="login-page.login" />
                    </Button>
                </div>

                <div className="m-4 d-flex flex-column align-items-center flex-grow-1">
                    <div className="flex-grow-1" />
                    <LocaleSelect />
                    <div className="d-flex align-items-end justify-content-between flex-grow-1">
                        <div style={{ width: "40%", maxWidth: 300 }}>
                            <img style={{ width: "100%", height: "100%" }} src="./GOE_Logo_Quer_Farbe_RGB.png" />
                        </div>
                        <div style={{ width: "40%", maxWidth: 300 }}>
                            <img
                                style={{ width: "100%", height: "100%" }}
                                src="./MWK-Wappen-RGB_Gefördert-durch_02.png"
                            />
                        </div>
                    </div>
                </div>
            </Container>
        </>
    );
};
