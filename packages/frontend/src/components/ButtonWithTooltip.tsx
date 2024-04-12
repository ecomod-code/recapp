import { TooltipWrapper } from "./TooltipWrapper";
import Button, { ButtonProps } from "react-bootstrap/Button";

interface Props extends ButtonProps {
    title: string;
}

export const ButtonWithTooltip = ({ title, ...buttonProps }: Props) => {
    return (
        <TooltipWrapper title={title}>
            <Button {...buttonProps} />
        </TooltipWrapper>
    );
};
