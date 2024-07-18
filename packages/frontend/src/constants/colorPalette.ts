import { CHECK_SYMBOL, X_SYMBOL } from "./layout";
import { getStoredPaletteKey } from "./storePaletteKey";

export type PaletteKey = "Palette 1" | "Palette 2";

export type PaletteItem = {
    right: { symbol: string; color: string; textColor?: string };
    wrong: { symbol: string; color: string; textColor?: string };
};

export const DEFAULT_PALETTE: PaletteKey = "Palette 1";

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
    right: { color: CORRECT_COLOR },
    wrong: { color: WRONG_COLOR },
} = colorPalette[getStoredPaletteKey()];

export { CORRECT_COLOR, WRONG_COLOR };
