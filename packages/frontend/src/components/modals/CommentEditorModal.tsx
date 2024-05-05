import { Trans } from "@lingui/react";
import { i18n } from "@lingui/core";
import { Button, Modal, Form } from "react-bootstrap";
import { useEffect, useState } from "react";
import "katex/dist/katex.css";

import MDEditor, { commands } from "@uiw/react-md-editor";
import { UserParticipation } from "@recapp/models";
import { maybe } from "tsmonads";
import { useRendered } from "../../hooks/useRendered";

const LABEL_MIN_WIDTH = 140;

export type CommentEditorModalOnSubmitParams = { text: string; name?: string; isRelatedToQuestion?: boolean };

interface Props {
    show: boolean;
    titleId: string;
    editorValue: string;
    isStudent: boolean;
    userNames: string[];
    participationOptions: UserParticipation[];
    showRelatedQuestionCheck?: boolean;
    onClose: () => void;
    onSubmit: ({ text, name }: CommentEditorModalOnSubmitParams) => void;
}

export const CommentEditorModal: React.FC<Props> = ({
    show,
    titleId,
    editorValue,
    onClose,
    onSubmit,
    isStudent,
    userNames,
    showRelatedQuestionCheck,
    participationOptions,
}) => {
    const [value, setValue] = useState<string>(editorValue);
    const { rendered } = useRendered({ value });
    const [name, setName] = useState<UserParticipation | undefined>(isStudent ? participationOptions[0] : undefined);
    const [isRelatedToQuestion, setIsRelatedToQuestion] = useState<boolean>(true);

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
                    <Form.Group className="d-flex mb-2 align-items-center">
                        <Form.Label style={{ minWidth: LABEL_MIN_WIDTH }}>{i18n._("author")}</Form.Label>
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
                    </Form.Group>

                    {showRelatedQuestionCheck ? (
                        <Form.Group className="d-flex mb-2">
                            <Form.Label style={{ minWidth: LABEL_MIN_WIDTH }}>
                                <Trans id="comment-editor-modal.link-to-question.checkbox-label" />
                            </Form.Label>
                            <Form.Check
                                name="answer"
                                type="checkbox"
                                checked={isRelatedToQuestion}
                                onChange={event => setIsRelatedToQuestion(event.target.checked)}
                            />
                        </Form.Group>
                    ) : null}

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
                        const text = value;
                        setValue("");

                        const commonValues = { text, ...(showRelatedQuestionCheck ? { isRelatedToQuestion } : {}) };

                        switch (name) {
                            case "ANONYMOUS":
                                onSubmit({ ...commonValues, name: i18n._("anonymous") });
                                break;
                            case "NAME":
                                onSubmit({ ...commonValues, name: userNames[0] });
                                break;
                            case "NICKNAME":
                                onSubmit({ ...commonValues, name: userNames[1] });
                                break;
                            default:
                                onSubmit({ ...commonValues, name: undefined });
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
                        setIsRelatedToQuestion(true);
                    }}
                >
                    <Trans id="cancel" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
