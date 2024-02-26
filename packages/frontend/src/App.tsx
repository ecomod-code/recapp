import { createBrowserRouter, Outlet, RouterProvider, useNavigate } from "react-router-dom";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { useEffect, useState } from "react";
import { dynamicActivate, defaultLocale } from "./i18n";
import { getStoredSelectedLocal } from "./components/layout/LocaleSelect";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import "bootstrap/dist/css/bootstrap.min.css";
import { minutes } from "itu-utils";
import Axios from "axios";
import { Layout } from "./layout/Layout";
import "./App.css";
import { useActorSystem, SystemContext } from "ts-actors-react";
import { UserAdminActor } from "./actors/UserAdminActor";
import { LocalUserActor } from "./actors/LocalUserActor";

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
	const system = useActorSystem(
		`${import.meta.env.VITE_BACKEND_URI.replace("http", "ws")}`,
		document.cookie.split(";")[0].split("=")[1]
	);
	useEffect(() => {
		if (!init) {
			system.forEach(async s => {
				await s.createActor(UserAdminActor, { name: "UserAdmin" });
				await s.createActor(LocalUserActor, { name: "LocalUser" });
				setInit(true);
			});
		}
	}, [init, system]);
	const navigate = useNavigate();

	if (!init) return null;
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
