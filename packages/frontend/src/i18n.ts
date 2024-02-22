import { i18n } from "@lingui/core";

export type SupportedLocale = "de" | "en";

export const locales: Record<SupportedLocale, { label: string; flag: string }> = {
	de: { label: "Deutsch", flag: "/flags/german.png" },
	en: { label: "English", flag: "/flags/english.png" },
};

const userLocale = navigator.language.split("-")[0];

export const defaultLocale: SupportedLocale = userLocale === "de" ? "de" : "en";

/**
 * We do a dynamic import of just the catalog that we need
 * @param locale any locale string
 */
export async function dynamicActivate(locale: SupportedLocale) {
	const { messages } = await import(`./locales/${locale}/messages.po`);

	i18n.load(locale, messages);
	i18n.activate(locale);
}
