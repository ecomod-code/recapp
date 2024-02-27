import MDEditor, { commands } from "@uiw/react-md-editor";
import { useEffect, useState } from "react";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

export const Editor: React.FC = () => {
	const [value, setValue] = useState<string | undefined>(`Hallo $a+b^2$

${"```"}math
a = c^2 \\sum X \\int xdx  
${"```"}`);
	const [rendered, setRendered] = useState<string>("");

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
		<div className="d-flex flex-row w-100 h-100">
			<div className="w-50" data-color-mode="light">
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
					onChange={setValue}
					height="100%"
					components={{ preview: (_source, _state, _dispath) => <></> }}
					preview="edit"
				/>
			</div>
			<div
				className="p-2 text-start"
				style={{ minHeight: "60vh" }}
				dangerouslySetInnerHTML={{ __html: rendered }}
			/>
		</div>
	);
};
