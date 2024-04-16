import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { UserParticipation } from "@recapp/models";
import { Props } from "./CommentEditorModal";

export const CommentEditorModal: React.FC<Props> = ({
	show,
	titleId,
	editorValue,
	onClose,
	onSubmit,
	isStudent,
	participationOptions,
}) => {
	const [value, setValue] = useState<string>(editorValue);
	const [rendered, setRendered] = useState<string>("");
	const [name, setName] = useState<string | undefined>(isStudent ? participationOptions[0] : undefined);
	useEffect(() => {
		setValue(editorValue);
	}, [editorValue]);
	useEffect(() => {
		const f = async () => {
			const result = await unified()
				.use(remarkParse)
				.use(remarkMath)
				.use(remarkRehype)
				.use(rehypeKatex)
				.use(rehypeStringify)
				.process(value);
			setRendered(result.toString());
		};
		f();
	}, [value]);
	return (
		<Modal show={show} dialogClassName="modal-80w">
			<Modal.Title className="p-1 ps-2 text-bg-primary">
				<div style={{ minWidth: "80vw" }}>
					<Trans id={titleId} />
					<Form.Select
						value={authorType}
						onChange={event => setAuthorType(event.target.value as UserParticipation)}
					>
						{allowedAuthorTypes.includes("NAME") && (
							<option value="NAME">{mbUser.flatMap(u => maybe(u.user?.username)).orElse("---")}</option>
						)}
						{allowedAuthorTypes.includes("NICKNAME") &&
							mbUser.flatMap(u => maybe(u.user?.nickname)).orElse("") !== "" && (
								<option value="NICKNAME">
									{mbUser.flatMap(u => maybe(u.user?.nickname)).orElse("---")}
								</option>
							)}
						{allowedAuthorTypes.includes("ANONYMOUS") && (
							<option value="TEXT">
								<Trans id="anonymous" />
							</option>
						)}
					</Form.Select>
				</div>
			</Modal.Title>
			<Modal.Body>
				<div className="d-flex flex-column flex-grow-1">
					<div className="d-flex flex-row">
						<Trans id="author" />: &nbsp
					</div>
					<div data-color-mode="light">
						<MDEditor
							commands={[
								commands.bold,
								commands.italic,
								commands.strikethrough,
								commands.divider,
								commands.link,
								commands.quote,
								commands.code,
								commands.divider,
								commands.unorderedListCommand,
								commands.orderedListCommand,
								commands.checkedListCommand,
								commands.divider,
								commands.help,
							]}
							extraCommands={[]}
							value={value}
							onChange={val => setValue(val ?? "")}
							height="100%"
							components={{ preview: (_source, _state, _dispath) => <></> }}
							preview="edit"
						/>
					</div>
					<div
						className="p-2 text-start h-30"
						style={{ minHeight: 150 }}
						dangerouslySetInnerHTML={{ __html: rendered }}
					/>
				</div>
			</Modal.Body>
			<Modal.Footer>
				<Button
					disabled={!value}
					className="m-1"
					onClick={() => {
						const v = value;
						setValue("");
						onSubmit(v);
					}}
				>
					<Trans id="okay" />
				</Button>
				<Button
					className="m-1"
					onClick={() => {
						setValue("");
						onClose();
					}}
				>
					<Trans id="cancel" />
				</Button>
			</Modal.Footer>
		</Modal>
	);
};
