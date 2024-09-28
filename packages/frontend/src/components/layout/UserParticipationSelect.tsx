import { ChangeEvent, useEffect, useState } from "react";
import { i18n } from "@lingui/core";
import Form from "react-bootstrap/Form";
import { UserParticipation } from "@recapp/models";
import { HEADER_SELECT_MIN_WIDTH } from "../../constants/layout";

// const userParticipationOptions: UserParticipation[] = ["ANONYMOUS", "NICKNAME", "NAME"];

const STORED_PARTICIPATION_LOCAL_KEY = "default-selected-participation-value";
const DEFAULT_PARTICIPATION_VALUE: UserParticipation = "ANONYMOUS";

export const getStoredParticipationValue = (): UserParticipation => {
    const storedLocal = localStorage.getItem(STORED_PARTICIPATION_LOCAL_KEY);

    if (!storedLocal) {
        // if no value is stored ..
        // 1. return the default value
        // 2. add the default value to the localStorage
        storeParticipationValue(DEFAULT_PARTICIPATION_VALUE);
        return DEFAULT_PARTICIPATION_VALUE;
    }

    const value = JSON.parse(storedLocal) as UserParticipation;

    return value;
};

const storeParticipationValue = (value: UserParticipation) => {
    localStorage.setItem(STORED_PARTICIPATION_LOCAL_KEY, JSON.stringify(value));
};

interface Props {
    label?: string;
}

export const UserParticipationSelect = (props: Props) => {
    const [selectedParticipation, setSelectedParticipation] = useState<UserParticipation>("ANONYMOUS");

    const onChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const selected = e.target.value as UserParticipation;
        storeParticipationValue(selected);
        setSelectedParticipation(selected);
    };

    const storedValue = getStoredParticipationValue();

    const userParticipationOptions: Record<UserParticipation, {value: UserParticipation, label: string; }> = {
        ANONYMOUS: {
            value: "ANONYMOUS", 
            label: i18n._("participation-select-option.anonymous")
        },
        NICKNAME: {
            value: "NICKNAME", 
            label: i18n._("participation-select-option.nickname")
        },
        NAME: {
            value: "NAME", 
            label: i18n._("participation-select-option.name")
        },
    };

    useEffect(() => {
        if (storedValue) {
            setSelectedParticipation(storedValue);
        }
    }, [storedValue]);

    return (
        <div>
            {props.label ? <span style={{ fontSize: 14 }}>{props.label}</span> : null}

            <div
            // style={{ display: "flex" }}
            >
                <div className="d-flex align-items-center">
                    <Form.Select
                        onChange={onChange}
                        style={{ minWidth: HEADER_SELECT_MIN_WIDTH, cursor: "pointer" }}
                        value={selectedParticipation}
                    >
                        {Object.values(userParticipationOptions).map(item => {
                            return (
                                <option key={item.value} value={item.value}>
                                    {item.label}
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
