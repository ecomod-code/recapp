// src/components/navigation/Root.tsx

import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import { Layout } from "../../layout/Layout";
import { SystemContext } from "ts-actors-react";
import { Button, Modal, Spinner } from "react-bootstrap";
import { cookie } from "../../utils";
import { system } from "../../system";
import { ActorSystem } from "ts-actors";
import { Try, fromError, fromValue } from "tsmonads";

export const Root: React.FC = () => {
  // 1) Keep the monadic Try<ActorSystem> so it matches your context type
  const [init, setInit] = useState<Try<ActorSystem>>(fromError(new Error()));
  const [rpcError, setRpcError] = useState<string>("");
  const navigate = useNavigate();

  const onRpcError = () => {
    setRpcError("");
    document.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
  };

  // 2) Bootstrap the actor system just once
  useEffect(() => {
    system
      .then(s => setInit(fromValue(s)))
      .catch(err => setInit(fromError(err)));
  }, []);

  // 3) After a successful init, check for the bearer cookie and redirect if missing
  useEffect(() => {
    init.match(
      // onSuccess
      () => {
        if (!cookie("bearer")) {
          navigate("/", { replace: true });
        }
      },
      // onFailure
      () => {
        /* do nothing on failure; modal handle below */
      }
    );
  }, [init, navigate]);

  // 4) If we hit an RPC error, show the modal
  if (rpcError) {
    return (
      <Modal show onHide={() => setRpcError("")}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Trans id="communication.error" message="Communication Error" />
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Trans
            id="communication.problem"
            message="There was a problem communicating with the backend."
          />
          <br />
          <Trans
            id="communication.retry"
            message="Please try again or contact support."
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onRpcError}>
            <Trans id="communication.logout" message="Log Out" />
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  // 5) While initializing, show a centered spinner
  const ready = init.match(() => true, () => false);
  if (!ready) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh"
      }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">
            <Trans id="loading" message="Loading..." />
          </span>
        </Spinner>
      </div>
    );
  }

  // 6) Everything’s good: render your app
  return (
    <SystemContext.Provider value={init}>
      <Layout>
        <Outlet />
      </Layout>
    </SystemContext.Provider>
  );
};
