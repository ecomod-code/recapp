import { Placement } from "react-bootstrap/esm/types";
import { TooltipWrapper } from "./TooltipWrapper";
import Button, { ButtonProps } from "react-bootstrap/Button";

interface Props extends ButtonProps {
    title: string;
    titlePlacement?: Placement;
}

export const ButtonWithTooltip = ({ title, titlePlacement, ...buttonProps }: Props) => {
    return (
        <TooltipWrapper title={title} placement={titlePlacement}>
            {/* the span-tag is here to make the tooltip visible event when the button is disabled !! */}
            {/* <span className="d-inline-block"> */}
            <Button {...buttonProps} />
            {/* </span> */}
        </TooltipWrapper>
    );
};
