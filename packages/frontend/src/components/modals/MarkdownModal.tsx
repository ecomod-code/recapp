import { Trans } from "@lingui/react";
import { Button, Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import "katex/dist/katex.css";
import MDEditor, { commands } from "@uiw/react-md-editor";
import { useRendered } from "../../hooks/useRendered";

interface Props {
    show: boolean;
    titleId: string;
    editorValue: string;
    onClose: () => void;
    onSubmit: (text: string) => void;
}

export const MarkdownModal: React.FC<Props> = ({ show, titleId, editorValue, onClose, onSubmit }) => {
    const [value, setValue] = useState<string>(editorValue);
    const { rendered } = useRendered({ value });

    useEffect(() => {
        setValue(editorValue);
    }, [editorValue]);

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
                            onChange={val => setValue(val ?? "")}
                            height="100%"
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            components={{ preview: (_source, _state, _dispatch) => <></> }}
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
                    variant="outline-primary"
                    onClick={() => {
                        setValue("");
                        onClose();
                    }}
                >
                    <Trans id="cancel" />
                </Button>

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
            </Modal.Footer>
        </Modal>
    );
};
