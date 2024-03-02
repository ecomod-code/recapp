import { createBrowserRouter, Outlet, RouterProvider, useNavigate } from "react-router-dom";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { useEffect, useState } from "react";
import { dynamicActivate, defaultLocale } from "./i18n";
import { getStoredSelectedLocal } from "./components/layout/LocaleSelect";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { Trans } from "@lingui/react";
import "bootstrap/dist/css/bootstrap.min.css";
import { minutes } from "itu-utils";
import Axios from "axios";
import { Layout } from "./layout/Layout";
import "./App.css";
import { useActorSystem, SystemContext, useStatefulActor } from "ts-actors-react";
import { UserAdminActor } from "./actors/UserAdminActor";
import { LocalUserActor } from "./actors/LocalUserActor";
import { CurrentQuizActor } from "./actors/CurrentQuizActor";
import { Button, Modal } from "react-bootstrap";
import { serializeError } from "serialize-error";
import { ErrorActor } from "./actors/ErrorActor";

const updateToken = () => {
	const mm = () => {
		const hasToken = document.cookie.includes("bearer");
		if (hasToken) {
			Axios.get(import.meta.env.VITE_BACKEND_URI + "/auth/refresh", { withCredentials: true })
				.then(() => {
					setTimeout(updateToken, minutes(import.meta.env.VITE_INACTIVITY_LIMIT).valueOf());
				})
				.catch(() => {
					alert(i18n._("app.could_not_refresh_token"));
					window.location.href = "/";
				});
		}
		window.removeEventListener("mousemove", mm);
		window.removeEventListener("touchstart", mm);
	};
	window.addEventListener("mousemove", mm);
	window.addEventListener("touchstart", mm);
};

setTimeout(updateToken, minutes(import.meta.env.VITE_INACTIVITY_LIMIT).valueOf());

const Root = () => {
	const [init, setInit] = useState(false);
	const [rpcError, setRpcError] = useState<string>("");
	const system = useActorSystem(
		`${import.meta.env.VITE_BACKEND_URI.replace("http", "ws")}`,
		document.cookie.split(";")[0].split("=")[1]
	);
	useEffect(() => {
		if (!init) {
			system.forEach(async s => {
				await s.createActor(ErrorActor, { name: "ErrorActor" });
				await s.createActor(UserAdminActor, { name: "UserAdmin" });
				await s.createActor(LocalUserActor, { name: "LocalUser" });
				await s.createActor(CurrentQuizActor, { name: "CurrentQuiz" });

				setInit(true);
			});
			system.onFailure(e => {
				const err = serializeError(e);
				if (!err.message?.toLocaleLowerCase().includes("not initialized")) {
					setRpcError("error-message-no-server-connection");
				}
			});
		}
	}, [init, system]);
	const navigate = useNavigate();
	const onRpcError = () => {
		setRpcError("");
		document.location.href = `${import.meta.env.VITE_BACKEND_URI}/auth/logout`;
	};

	if (rpcError !== "") {
		return (
			<Modal show={true}>
				<Modal.Title className="ps-2 bg-warning">{i18n._(rpcError + "-title")}</Modal.Title>
				<Modal.Body>
					<Trans id={rpcError} />
				</Modal.Body>
				<Modal.Footer className="p-0">
					<Button onClick={onRpcError}>Neu anmelden</Button>
				</Modal.Footer>
			</Modal>
		);
	}
	if (!init) {
		return null;
	}
	if (!document.cookie.includes("bearer")) {
		navigate("/login", { replace: true });
	}
	return (
		<SystemContext.Provider value={system}>
			<Layout>
				<Outlet />
			</Layout>
		</SystemContext.Provider>
	);
};

const router = createBrowserRouter([
	{
		path: "/",
		element: <Login />,
	},
	{
		path: "/Dashboard",
		element: <Root />,
		// errorElement: <ErrorPage />,
		children: [
			{
				path: "/Dashboard",
				element: <Dashboard />,
			},
		],
	},
]);

const App: React.FC = () => {
	useEffect(() => {
		const storedLocal = getStoredSelectedLocal();

		if (storedLocal) {
			dynamicActivate(storedLocal);
		} else {
			dynamicActivate(defaultLocale);
		}
	}, []);
	return (
		<I18nProvider i18n={i18n}>
			<RouterProvider router={router} />
		</I18nProvider>
	);
};

export default App;
