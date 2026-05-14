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
    // Track both the rendered HTML and the input it was produced from so
    // callers can detect when the rendered output is stale relative to the
    // current value (the unified pipeline is async).
    const [state, setState] = useState<{ value: string; rendered: string }>({ value: "", rendered: "" });

    useEffect(() => {
        let cancelled = false;
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
            // Drop the result if the input changed (or component unmounted)
            // while the pipeline was running, to avoid out-of-order writes.
            if (cancelled) return;
            setState({ value, rendered: result.toString() });
        };
        f();
        return () => {
            cancelled = true;
        };
    }, [value]);

    return { rendered: state.rendered, isStale: state.value !== value };
    };
