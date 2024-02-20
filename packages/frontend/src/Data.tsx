import { User } from "@recapp/models";
import { useStatefulActor } from "./hooks/useStatefulActor";

export const Data: React.FC = () => {
	const [_, state] = useStatefulActor<User>("LocalUser", {} as User);
	return <div>{JSON.stringify(state)}</div>;
};
