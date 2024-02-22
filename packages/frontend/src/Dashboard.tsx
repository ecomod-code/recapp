import React from "react";
import { SystemContext } from "./SystemContext";
import { Data } from "./Data";
import { useSystemInit } from "./hooks/useSystemInit";

export const Dashboard: React.FC = () => {
	const system = useSystemInit();
	return (
		<React.StrictMode>
			<div>
				<a href="http://localhost:3123/auth/logout">Logout</a>
			</div>
			<SystemContext.Provider value={system}>
				<Data />
			</SystemContext.Provider>
		</React.StrictMode>
	);
};
