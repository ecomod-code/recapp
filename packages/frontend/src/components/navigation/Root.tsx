// src/components/navigation/Root.tsx

import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { i18n } from "@lingui/core";             // keep if you use programmatic i18n APIs
import { Trans } from "@lingui/react";            // keep if you’re using <Trans> anywhere
import { Layout } from "../../layout/Layout";
import { SystemContext } from "ts-actors-react";
import { Button, Modal } from "react-bootstrap";
import { cookie } from "../../utils";
import { system } from "../../system";
import { ActorSystem } from "ts-actors";
import { Try, fromError, fromValue } from "tsmonads";

export const Root: React.FC = () => {
  const [init, setInit] = useState<Try<ActorSystem>>(fromError(new Error()));
  const [rpcError, setRpcError] = useState<string>("");
  const navigate = useNavigate();

  const onRpcError = () => {
    setRpcError("");
    document.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
  };

  // 1) Initialize the actor system once on mount
  useEffect(() => {
    const run = async () => {
      try {
        const s: ActorSystem = await system;
        setInit(fromValue(s));
      } catch (e) {
        setInit(fromError(e as Error));
      }
    };
    run();
  }, []);

  // 2) After initialization, check the bearer cookie and redirect if missing
  useEffect(() => {
    if (init.isValue) {
      if (!cookie("bearer")) {
        navigate("/", { replace: true });
      }
    }
  }, [init, navigate]);

  // 3) Handle any RPC‐level errors in a modal
  if (rpcError !== "") {
    return (
      <Modal show onHide={() => setRpcError("")}>
        <Modal.Header closeButton>
          <Modal.Title><Trans>Communication Error</Trans></Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Trans>There was a problem communicating with the backend.</Trans>
          <br />
          <Trans>Please try again or contact support.</Trans>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onRpcError}>
            <Trans>Log Out</Trans>
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  // 4) While the actor system is initializing, render nothing (or a spinner)
  if (!init.isValue) {
    return null;
  }

  // 5) Once ready and authenticated, render the layout and child routes
  return (
    <SystemContext.Provider value={init.value}>
      <Layout>
        <Outlet />
      </Layout>
    </SystemContext.Provider>
  );
};
