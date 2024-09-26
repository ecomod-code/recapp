import { ChangeEvent, useState } from "react";
import Form from "react-bootstrap/Form";
import { UserParticipation } from "@recapp/models";
import { HEADER_SELECT_MIN_WIDTH } from "../../constants/layout";

const userParticipationOptions: UserParticipation[] = ["ANONYMOUS", "NAME", "NICKNAME"];

interface Props {
    label?: string;
}

export const UserParticipationSelect = (props: Props) => {
    const [selectedParticipation, setSelectedParticipation] = useState<UserParticipation>("ANONYMOUS");

    const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value as UserParticipation;
        setSelectedParticipation(selected);
    };

    return (
        <div>
            {props.label ? <span style={{fontSize: 14 }}>{props.label}</span> : null}

            <div
            // style={{ display: "flex" }}
            >
                <div className="d-flex align-items-center">
                    <Form.Select
                        onChange={onChange}
                        style={{ minWidth: HEADER_SELECT_MIN_WIDTH, cursor: "pointer" }}
                        value={selectedParticipation}
                    >
                        {userParticipationOptions.map(value => {
                            return (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            );
                        })}
                        <div />
                    </Form.Select>
                </div>
                <div></div>
            </div>
        </div>
    );
};
