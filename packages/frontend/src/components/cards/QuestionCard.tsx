import { i18n } from "@lingui/core";
import { Question, Id } from "@recapp/models";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import { ArrowUp, ArrowDown, Pencil, TrainFront, Check, Trash, Eye } from "react-bootstrap-icons";
import { ButtonWithTooltip } from "../ButtonWithTooltip";

type Props = {
	question: Question;
	moveUp: () => void;
	moveDown: () => void;
	approve: () => void;
	delete: () => void;
	edit: () => void;
	changeGroup: () => void;
	disabled: boolean;
	currentUserUid: Id;
	editMode: boolean;
	isFirst: boolean;
	isLast: boolean;
	writeAccess: boolean;
	state: string;
};

export const QuestionCard = (props: Props) => {
	return (
		<Card className="p-0">
			<Card.Body as="div" className="p-0 m-0 d-flex flex-row align-items-center">
				<div className="d-flex flex-column h-100 ms-2 me-1">
					<Button
						variant="light"
						style={{ border: "1px solid grey" }}
						size="sm"
						onClick={props.moveUp}
						disabled={props.disabled || !props.editMode || props.isFirst}
					>
						<ArrowUp />
					</Button>
					<div className="flex-grow-1">&nbsp;</div>
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
				<div
					className="flex-grow-1 text-start p-2 me-2"
					dangerouslySetInnerHTML={{ __html: props.question.text }}
				/>
				<div className="d-flex flex-column h-100">
					<Badge as="div" className="mt-2 me-2" bg="info">
						{props.question.type}
					</Badge>
					<div className="me-2"> {i18n._("authored-by", { author: props.question.authorName })} </div>
					<div className="mt-0">
						{props.writeAccess && props.state === "EDITING" ? (
							<ButtonWithTooltip
								title={i18n._("question-card.button-tooltip.edit")}
								className="m-2"
								onClick={props.edit}
								variant={props.question.editMode ? "secondary" : "primary"}
								disabled={
									(props.disabled &&
										(props.question.authorId !== props.currentUserUid ||
											props.question.approved)) ||
									!props.editMode
								}
							>
								<Pencil />
							</ButtonWithTooltip>
						) : (
							<ButtonWithTooltip
								title={i18n._("question-card.button-tooltip.view")}
								className="m-2"
								onClick={props.edit}
								variant={props.question.editMode ? "secondary" : "primary"}
							>
								<Eye />
							</ButtonWithTooltip>
						)}
						<ButtonWithTooltip
							title={i18n._("question-card.button-tooltip.change-group")}
							className="m-2"
							onClick={props.changeGroup}
							disabled={props.disabled || !props.editMode}
						>
							<TrainFront />
						</ButtonWithTooltip>
						<ButtonWithTooltip
							title={i18n._("question-card.button-tooltip.approve")}
							className="m-2"
							variant={props.question.approved ? "success" : "warning"}
							onClick={props.approve}
							disabled={props.disabled || !props.editMode}
						>
							<Check />
						</ButtonWithTooltip>
						<ButtonWithTooltip
							title={i18n._("question-card.button-tooltip.delete")}
							className="m-2"
							variant={"danger"}
							onClick={props.delete}
							disabled={props.disabled || props.question.approved || !props.editMode}
						>
							<Trash />
						</ButtonWithTooltip>
					</div>
				</div>
			</Card.Body>
		</Card>
	);
};
