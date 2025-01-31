import { i18n } from "@lingui/core";
import { Question, Id } from "@recapp/models";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
// import { ArrowUp, ArrowDown, Pencil, TrainFront, Check, Trash, Eye } from "react-bootstrap-icons";
import { ArrowUp, ArrowDown, Pencil, Trash, Eye, EyeSlash } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";
import { useRendered } from "../../hooks/useRendered";
import { OverviewIcon } from "./OverviewIcon";
import { TooltipWrapper } from "../TooltipWrapper";

const CONTAINER_MIN_HEIGHT = 160;
const ARROW_CONTAINER_MAX_HEIGHT = CONTAINER_MIN_HEIGHT;

type Props = {
	question: Question;
	moveUp: () => void;
	moveDown: () => void;
	approve: () => void;
	delete: () => void;
	edit: () => void;
	// changeGroup: () => void;
	disabled: boolean;
	currentUserUid: Id;
	editMode: boolean;
	isFirst: boolean;
	isLast: boolean;
	writeAccess: boolean;
	state: string;
	isUserInTeachersList: boolean
};

export const QuestionCard = (props: Props) => {
	const { rendered } = useRendered({ value: props.question.text });

	return (
		<Card className="p-0 mb-2">
			<Card.Body
				as="div"
				style={{ minHeight: CONTAINER_MIN_HEIGHT }}
				className="pt-1 pb-2 ps-0 pe-2 m-0 d-flex flex-row align-items-center"
			>
				<div
					style={{ maxHeight: ARROW_CONTAINER_MAX_HEIGHT }}
					className="d-flex flex-column align-items-center justify-content-around gap-4 mx-2"
				>
					<Button
						variant="light"
						style={{ border: "1px solid grey" }}
						size="sm"
						onClick={props.moveUp}
						disabled={props.disabled || !props.editMode || props.isFirst}
					>
						<ArrowUp />
					</Button>
					<Button
						variant="light"
						style={{ border: "1px solid grey" }}
						size="sm"
						onClick={props.moveDown}
						disabled={props.disabled || !props.editMode || props.isLast}
					>
						<ArrowDown />
					</Button>
				</div>
				<div className="flex-fill align-self-stretch d-flex flex-column justify-content-between">
					<div className="d-flex justify-content-between">
						{ props.question.authorFingerprint ? <TooltipWrapper title={props.question.authorFingerprint}>
							<span className="text-secondary">
								{i18n._("authored-by", { author: props.question.authorName })}
							</span>
						</TooltipWrapper> : <span className="text-secondary">
								{i18n._("authored-by", { author: props.question.authorName })}
							</span>}
						<Badge as="div" className="align-self-center" bg="info">
							{props.question.type}
						</Badge>
					</div>

					{/* <div className="custom-line-clamp">
						<div onClick={props.edit} dangerouslySetInnerHTML={{ __html: rendered }} />
					</div> */}

                    <div className="custom-line-clamp">
                        <div dangerouslySetInnerHTML={{ __html: rendered }} />
                    </div>

					<div className="d-flex justify-content-end gap-2">

						{/*  { props.writeAccess ? ( */}
                        {props.writeAccess && props.state === "EDITING" ? (
                            <ButtonWithTooltip
                                title={i18n._("question-card.button-tooltip.edit")}
                                onClick={props.edit}
                                variant={props.question.editMode ? "secondary" : "primary"}
                                // disabled={props.state !== "EDITING"}
                                // disabled={
                                // 	(props.disabled &&
                                // 		(props.question.authorId !== props.currentUserUid ||
                                // 			props.question.approved)) ||
                                // 	!props.editMode
                                // }
                            >
                                <Pencil />
                            </ButtonWithTooltip>
                        ) : (
                            <ButtonWithTooltip
                                title={i18n._("question-card.button-tooltip.view")}
                                onClick={props.edit}
                                variant={props.question.editMode ? "secondary" : "primary"}
                            >
                                <OverviewIcon size={16} />
                            </ButtonWithTooltip>
                        )}

						{/* <ButtonWithTooltip
							title={i18n._("question-card.button-tooltip.change-group")}
							onClick={props.changeGroup}
							disabled={props.disabled || !props.editMode}
						>
							<TrainFront />
						</ButtonWithTooltip> */}

                        {props.isUserInTeachersList ? (
                            <ButtonWithTooltip
                                title={
                                    props.question.approved
                                        ? i18n._("question-card.button-tooltip.hide")
                                        : i18n._("question-card.button-tooltip.show")
                                }
                                variant={props.question.approved ? "success" : "warning"}
                                onClick={props.approve}
                                disabled={props.disabled || !props.editMode}
                            >
                                {props.question.approved ? <Eye /> : <EyeSlash />}
                            </ButtonWithTooltip>
                        ) : null}


                        {props.writeAccess ? (
                            <ButtonWithTooltip
                                title={i18n._("question-card.button-tooltip.delete")}
                                variant="danger"
                                onClick={props.delete}
                                // disabled={props.disabled || props.question.approved || !props.editMode}
                                disabled={
                                    // props.question.approved || !props.editMode
                                    (props.isUserInTeachersList && props.question.approved) || !props.editMode
                                }
                            >
                                <Trash />
                            </ButtonWithTooltip>
                        ) : null}
					</div>
				</div>
			</Card.Body>
		</Card>
	);
};
