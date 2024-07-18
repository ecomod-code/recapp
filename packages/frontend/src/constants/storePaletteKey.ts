import { DEFAULT_PALETTE, PaletteKey } from "./colorPalette";

export const STORED_PALETTE_LOCALE_KEY = "selected-palette";

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
    console.log({ value });

    return value;
};

export const storePaletteKey = (selectedPalette: PaletteKey) => {
    localStorage.setItem(STORED_PALETTE_LOCALE_KEY, JSON.stringify(selectedPalette));
};
