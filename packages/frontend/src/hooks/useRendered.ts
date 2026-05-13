import { useEffect, useState } from "react";
import "katex/dist/katex.css";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

// Allow KaTeX-generated class/style attributes while blocking everything else.
const sanitizeSchema = {
    ...defaultSchema,
    attributes: {
        ...defaultSchema.attributes,
        span: [...(defaultSchema.attributes?.span ?? []), "className", "style"],
        div: [...(defaultSchema.attributes?.div ?? []), "className", "style"],
    },
};

export const useRendered = ({ value }: { value: string }) => {
    const [rendered, setRendered] = useState<string>("");

    useEffect(() => {
        const f = async () => {
            const result = await unified()
                .use(remarkParse)
                .use(remarkGfm)
                .use(remarkMath)
                .use(remarkRehype)
                .use(rehypeKatex)
                .use(rehypeSanitize, sanitizeSchema)
                .use(rehypeStringify)
                .process(value);
            setRendered(result.toString());
        };
        f();
    }, [value]);

    return { rendered };
};
