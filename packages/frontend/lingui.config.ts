import type { LinguiConfig } from "@lingui/conf";

const config: LinguiConfig = {
	locales: ["de", "en"],
	sourceLocale: "de",
	catalogs: [
		{
			path: "src/locales/{locale}/messages",
			include: ["src"],
		},
	],
	format: "po",
};

export default config;
