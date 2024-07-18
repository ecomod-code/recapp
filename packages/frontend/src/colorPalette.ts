import { CHECK_SYMBOL, X_SYMBOL } from "./constants/layout";

export type PaletteKey = "Palette 1" | "Palette 2";

export type PaletteItem = {
    right: { symbol: string; color: string; textColor?: string };
    wrong: { symbol: string; color: string; textColor?: string };
};

export const STORED_PALETTE_LOCALE_KEY = "selected-palette";
export const DEFAULT_PALETTE: PaletteKey = "Palette 1";

export const getStoredPaletteKey = (): PaletteKey => {
    const storedLocal = localStorage.getItem(STORED_PALETTE_LOCALE_KEY);

    if (!storedLocal) {
        // if no key is stored ..
        // 1. return the default key
        // 2. add the default key to the localStorage
        storePaletteKey(DEFAULT_PALETTE);
        return DEFAULT_PALETTE;
    }

    const value = JSON.parse(storedLocal) as PaletteKey;

    return value;
};

export const storePaletteKey = (selectedPalette: PaletteKey) => {
    localStorage.setItem(STORED_PALETTE_LOCALE_KEY, JSON.stringify(selectedPalette));
};

export const colorPalette: Record<PaletteKey, PaletteItem> = {
    "Palette 1": {
        right: { symbol: CHECK_SYMBOL, color: "#198754", textColor: "white" },
        wrong: { symbol: X_SYMBOL, color: "#dc3545", textColor: "white" },
    },
    "Palette 2": {
        right: { symbol: CHECK_SYMBOL, color: "#004488", textColor: "white" },
        wrong: { symbol: X_SYMBOL, color: "#DDAA33" },
    },
};

const {
    right: { color: CORRECT_COLOR, textColor: CORRECT_COLOR_TEXT },
    wrong: { color: WRONG_COLOR, textColor: WRONG_COLOR_TEXT },
} = colorPalette[getStoredPaletteKey()];

export { CORRECT_COLOR, WRONG_COLOR, CORRECT_COLOR_TEXT, WRONG_COLOR_TEXT };
