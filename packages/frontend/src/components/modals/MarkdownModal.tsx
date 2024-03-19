import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";
import { i18n } from "@lingui/core";
import { useEffect, useState } from "react";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import MDEditor, { commands } from "@uiw/react-md-editor";

interface Props {
	show: boolean;
	titleId: string;
	editorValue: string;
	onClose: () => void;
	onSubmit: (text: string) => void;
}

export const MarkdownModal: React.FC<Props> = ({ show, titleId, editorValue, onClose, onSubmit }) => {
	const [value, setValue] = useState<string>(editorValue);
	const [rendered, setRendered] = useState<string>("");
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
				</div>
			</Modal.Title>
			<Modal.Body>
				<div className="d-flex flex-column flex-grow-1">
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
							onChange={val => val && setValue(val)}
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
