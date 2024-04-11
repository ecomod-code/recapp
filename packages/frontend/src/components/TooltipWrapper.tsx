import { PropsWithChildren } from "react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { Placement } from "react-bootstrap/esm/types";

type Props = {
    title: string;
    placement?: Placement;
} & PropsWithChildren;

export const TooltipWrapper = ({ placement = "top", title, children }: Props) => {
    return (
        <OverlayTrigger //
            placement={placement}
            overlay={<Tooltip>{title}</Tooltip>}
        >
            {children as any}
        </OverlayTrigger>
    );
};
