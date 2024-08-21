import { Placement } from "react-bootstrap/esm/types";
import { TooltipWrapper } from "./TooltipWrapper";
import Button, { ButtonProps } from "react-bootstrap/Button";
// import { PropsWithChildren } from "react";

interface Props extends ButtonProps {
    title: string;
    titlePlacement?: Placement;
    isTooltipVisibleWhenButtonIsDisabled?: boolean;
}

export const ButtonWithTooltip = ({
    title,
    titlePlacement,
    isTooltipVisibleWhenButtonIsDisabled,
    ...buttonProps
}: Props) => {
    const renderButton = () => {
        if (isTooltipVisibleWhenButtonIsDisabled) {
            // the span-tag is here to make the tooltip visible event when the button is disabled !!
            return (
                <span className="d-inline-block">
                    <Button {...buttonProps} />
                </span>
            );
        }

        return <Button {...buttonProps} />;
    };

    return (
        <TooltipWrapper title={title} placement={titlePlacement}>
            {renderButton()}
        </TooltipWrapper>
    );
};
