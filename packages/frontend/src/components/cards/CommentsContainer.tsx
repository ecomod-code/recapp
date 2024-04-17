import { PropsWithChildren } from "react";
import Button from "react-bootstrap/Button";
import { Plus } from "react-bootstrap-icons";
import { Trans } from "@lingui/react";

type Props = {
	showCommentArea: boolean;
	onClickAddComment: () => void;
} & PropsWithChildren;

export const CommentsContainer = (props: Props) => {
	if (!props.showCommentArea) {
		return null;
	}
	return (
		<div
			className="d-flex align-items-center border"
			style={{
				maxHeight: "19rem",
				overflowY: "hidden",
				overflowX: "auto",
				backgroundColor: "#f5f5f5",
				minHeight: "18rem",
			}}
		>
			<div className="d-flex flex-column justify-content-center align-items-center p-4">
				<Button variant="secondary" onClick={props.onClickAddComment}>
					<Plus size={100} />
				</Button>
				<span style={{ width: 140, fontSize: "1.2rem", textAlign: "center" }}>
					<Trans id="comment-row-new-comment-button" />
				</span>
			</div>

			{props.children}
		</div>
	);
};
