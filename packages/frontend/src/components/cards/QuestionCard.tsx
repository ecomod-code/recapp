import { Question, Id } from "@recapp/models";
import { Card, Button, Badge } from "react-bootstrap";
import { ArrowUp, ArrowDown, Pencil, TrainFront, Check, Trash } from "react-bootstrap-icons";
import { i18n } from "@lingui/core";

export const QuestionCard = (props: {
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
}) => {
	return (
		<Card className="p-0">
			<Card.Body as="div" className="p-0 m-0 d-flex flex-row align-items-center">
				<div className="d-flex flex-column h-100 me-1">
					<div>
						<Button
							variant="light"
							size="sm"
							onClick={props.moveUp}
							disabled={props.disabled || !props.editMode}
						>
							<ArrowUp />
						</Button>
					</div>
					<div className="flex-grow-1">&nbsp;</div>
					<div>
						<Button
							variant="light"
							size="sm"
							onClick={props.moveDown}
							disabled={props.disabled || !props.editMode}
						>
							<ArrowDown />
						</Button>
					</div>
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
						<Button
							className="m-2"
							onClick={props.edit}
							disabled={
								props.question.editMode ||
								(props.disabled &&
									(props.question.authorId !== props.currentUserUid || props.question.approved)) ||
								!props.editMode
							}
						>
							<Pencil />
						</Button>
						<Button
							className="m-2"
							onClick={props.changeGroup}
							disabled={props.disabled || !props.editMode}
						>
							<TrainFront />
						</Button>
						<Button
							className="m-2"
							variant={props.question.approved ? "success" : "warning"}
							onClick={props.approve}
							disabled={props.disabled || !props.editMode}
						>
							<Check />
						</Button>
						<Button
							className="m-2"
							variant={"danger"}
							onClick={props.delete}
							disabled={props.disabled || props.question.approved || !props.editMode}
						>
							<Trash />
						</Button>
					</div>
				</div>
			</Card.Body>
		</Card>
	);
};
