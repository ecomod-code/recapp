import { User } from "@recapp/models";
import { useStatefulActor } from "./hooks/useStatefulActor";
import { i18n } from "@lingui/core";

export const Data: React.FC = () => {
	const [_, state] = useStatefulActor<{ user: User }>("LocalUser", { user: {} as User });
	const response = i18n._("dashboard.greet-user") + " " + state.user.username;
	return <div>{response}</div>;
};
