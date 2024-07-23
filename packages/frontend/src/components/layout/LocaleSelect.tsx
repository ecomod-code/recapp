import React from "react";
import { useNavigate } from "react-router-dom";
import { useLingui } from "@lingui/react";
import { DateTime } from "luxon";
import { SupportedLocale, dynamicActivate, locales } from "../../i18n";
import { Form } from "react-bootstrap";
import { HEADER_SELECT_MIN_WIDTH } from "../../constants/layout";

const STORED_SELECTED_LOCALE_KEY = "USER_LOCALE";

type StoredLocalInfo = { value: SupportedLocale; expireDate: number };

export const getStoredSelectedLocal = (): SupportedLocale | undefined => {
    const storedLocal = localStorage.getItem(STORED_SELECTED_LOCALE_KEY);

    if (!storedLocal) {
        return;
    }

    const { expireDate, value } = JSON.parse(storedLocal) as StoredLocalInfo;

    const currentTime = DateTime.local().valueOf();
    if (currentTime > expireDate) {
        return;
    }

    return value;
};

const storeSelectedLocal = (selectedLocal: SupportedLocale) => {
    const localInfo: StoredLocalInfo = {
        value: selectedLocal,
        expireDate: DateTime.local().plus({ month: 1 }).valueOf(),
    };

    localStorage.setItem(STORED_SELECTED_LOCALE_KEY, JSON.stringify(localInfo));
};

export const LocaleSelect = () => {
    const navigation = useNavigate();

    const {
        i18n: { locale: activeLocale },
    } = useLingui();

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedLocal = e.target.value as SupportedLocale;

        storeSelectedLocal(selectedLocal);

        dynamicActivate(selectedLocal);

        navigation("/", { replace: true });
        window.location.reload();
    };

    const flagSrc = locales[activeLocale as SupportedLocale].flag;

    return (
        <div style={style}>
            <div>
                <Form.Select onChange={onChange} style={{ minWidth: HEADER_SELECT_MIN_WIDTH }} value={activeLocale}>
                    {Object.entries(locales).map(([local, label]) => {
                        return (
                            <option key={local} value={local}>
                                {label.label}
                            </option>
                        );
                    })}
                </Form.Select>
            </div>

            <div className="ms-2" style={{ marginBottom: 4, width: 34 }}>
                <img src={flagSrc} alt="country flag" style={{ width: "100%", height: "100%" }} />
            </div>
        </div>
    );
};

const style: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    justifyContent: "start",
    alignItems: "center",
};
