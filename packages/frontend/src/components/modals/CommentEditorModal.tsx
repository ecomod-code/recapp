import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { Button, Modal, Form } from "react-bootstrap";
import { useEffect, useState } from "react";
import "katex/dist/katex.css";

import MDEditor, { commands } from "@uiw/react-md-editor";
import { UserParticipation } from "@recapp/models";
import { maybe } from "tsmonads";
import { useRendered } from "../../hooks/useRendered";

interface Props {
    show: boolean;
    titleId: string;
    editorValue: string;
    isStudent: boolean;
    userNames: string[];
    participationOptions: UserParticipation[];
    onClose: () => void;
    onSubmit: (text: string, as?: string) => void;
}

export const CommentEditorModal: React.FC<Props> = ({
    show,
    titleId,
    editorValue,
    onClose,
    onSubmit,
    isStudent,
    userNames,
    participationOptions,
}) => {
    const [value, setValue] = useState<string>(editorValue);
    const { rendered } = useRendered({ value });
    const [name, setName] = useState<UserParticipation | undefined>(isStudent ? participationOptions[0] : undefined);
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
                    <div className="d-flex mb-2 align-items-center">
                        <div className="pt-4">{i18n._("author")}: &nbsp;</div>
                        <Form.Select value={name} onChange={event => setName(event.target.value as UserParticipation)}>
                            {participationOptions.includes("NAME") && <option value="NAME">{userNames[0]}</option>}
                            {participationOptions.includes("NICKNAME") && maybe(userNames[1]).orElse("") !== "" && (
                                <option value="NICKNAME">{userNames[1]}</option>
                            )}
                            {participationOptions.includes("ANONYMOUS") && (
                                <option value="ANONYMOUS">
                                    <Trans id="anonymous" />
                                </option>
                            )}
                        </Form.Select>
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
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                        switch (name) {
                            case "ANONYMOUS":
                                onSubmit(v, i18n._("anonymous"));
                                break;
                            case "NAME":
                                onSubmit(v, userNames[0]);
                                break;
                            case "NICKNAME":
                                onSubmit(v, userNames[1]);
                                break;
                            default:
                                onSubmit(v, undefined);
                                break;
                        }
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
