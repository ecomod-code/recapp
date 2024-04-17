import Badge from "react-bootstrap/Badge";
import { Quiz } from "@recapp/models";

type BadgeState = Quiz["state"] | "ARCHIVED" | undefined;

const getBG = (state: BadgeState): string => {
    switch (state) {
        case "EDITING":
            return "primary";
        case "STARTED":
            return "success";
        case "STOPPED":
            return "warning";
        default:
            return "secondary";
    }
};

interface Props {
    state: BadgeState;
}

export const QuizStateBadge = (props: Props) => {
    return (
        <Badge as="div" className="mt-2" bg={getBG(props.state ?? "ACTIVE")}>
            <span style={{ fontWeight: "bold" }}>{props.state}</span>
        </Badge>
    );
};
