import { useContext, useEffect, useState } from "react";
import { SystemContext } from "./SystemContext";

export const Data: React.FC = () => {
	const system = useContext(SystemContext);
	const [state, setState] = useState<any>({});
	useEffect(() => {
		system
			?.ask("actors://recapp-backend/UserStore", {
				UserStoreMessage: "GetUser",
				value: "hendrik.belitz",
			})
			.then(result => {
				setState(result);
			});
	}, [system]);
	return <div>{JSON.stringify(state)}</div>;
};
