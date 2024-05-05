import { useState } from "react";
import { Trans } from "@lingui/react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import axios from "axios";
import { useStatefulActor } from "ts-actors-react";
import { UploadQuizMessage } from "../../actors/LocalUserActor";

interface Props {
    show: boolean;
    onClose: () => void;
}

export const QuizImportModal: React.FC<Props> = ({ show, onClose }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [, tryActor] = useStatefulActor<unknown>("LocalUser");

    const upload = async () => {
        const formData = new FormData();

        formData.append("name", selectedFile.name);
        formData.append("file", selectedFile);

        const result = await axios.post(`${import.meta.env.VITE_BACKEND_URI}/upload`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        const filename = result.data;
        tryActor.forEach(actor => actor.send(actor, new UploadQuizMessage(filename)));
        onClose();
    };

    const handleClose = () => {
        setSelectedFile(null);
        onClose();
    };

    return (
        <Modal show={show} dialogClassName="modal-80w" onEscapeKeyDown={handleClose}>
            <Modal.Title className="p-1 ps-2 text-bg-primary">
                <div style={{ minWidth: "80vw" }}>
                    <Trans id="quiz-import-modal-title" />
                </div>
            </Modal.Title>
            <Modal.Body>
                <div className="d-flex flex-column flex-grow-1">
                    <Trans id="quiz-import-modal-message" />
                    <div>
                        <div>
                            <input
                                type="file"
                                onChange={event => {
                                    setSelectedFile(event?.target?.files?.[0]);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button className="m-1" disabled={!selectedFile} type="submit" onClick={upload}>
                    <Trans id="import" />
                </Button>
                <Button className="m-1" onClick={handleClose}>
                    <Trans id="cancel" />
                </Button>
            </Modal.Footer>
        </Modal>
    );
};
