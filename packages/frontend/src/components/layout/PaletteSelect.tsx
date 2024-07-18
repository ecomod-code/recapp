import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import { HEADER_SELECT_MIN_WIDTH } from "../../constants/layout";
import { getStoredPaletteKey, storePaletteKey } from "../../constants/storePaletteKey";
import { PaletteKey } from "../../constants/colorPalette";
import { colorPalette } from "../../constants/colorPalette";

export const PaletteSelect = () => {
    const navigation = useNavigate();
    const [activePaletteKey, setActivePaletteKey] = useState<PaletteKey>(() => getStoredPaletteKey());

    const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedPaletteKey = e.target.value as PaletteKey;

        storePaletteKey(selectedPaletteKey);

        setActivePaletteKey(selectedPaletteKey);

        navigation("/", { replace: true });
        window.location.reload();
    };

    const activePalette = colorPalette[activePaletteKey];

    return (
        <div className="d-flex align-items-center">
            <div>
                <Form.Select onChange={onChange} style={{ minWidth: HEADER_SELECT_MIN_WIDTH }} value={activePaletteKey}>
                    {Object.entries(colorPalette).map(([paletteKey]) => {
                        return (
                            <option key={paletteKey} value={paletteKey}>
                                {paletteKey}
                            </option>
                        );
                    })}
                </Form.Select>
            </div>

            <div className="ms-2">
                <div className="d-flex flex-1 align-items-center gap-1">
                    {Object.entries(activePalette).map(([key, { color, textColor, symbol }]) => {
                        return (
                            <div
                                key={key}
                                className="d-flex justify-content-center align-items-center"
                                style={{
                                    backgroundColor: color,
                                    color: textColor,
                                    width: 30,
                                    aspectRatio: 1,
                                    borderRadius: 5,
                                    // outline: "2px solid lightgray",
                                }}
                            >
                                <span className="fw-bold" style={{ fontSize: 12 }}>
                                    {symbol}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
