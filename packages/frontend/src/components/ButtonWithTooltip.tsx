import { TooltipWrapper } from "./TooltipWrapper";
import Button, { ButtonProps } from "react-bootstrap/Button";

interface Props extends ButtonProps {
    title: string;
}

export const ButtonWithTooltip = ({ title, ...buttonProps }: Props) => {
    return (
        <TooltipWrapper title={title}>
            {/* the span-tag is here to make the tooltip visible event when the button is disabled !! */}
            <span className="d-inline-block">
                <Button {...buttonProps} />
            </span>
        </TooltipWrapper>
    );
};
