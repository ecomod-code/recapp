import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { lingui } from "@lingui/vite-plugin";
import styleX from "vite-plugin-stylex";
import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		lingui(),
		styleX(),
		eslintPlugin({
			cache: false,
			include: ["./src/**/*.ts", "./src/**/*.tsx"],
			exclude: [],
		}),
	],
});
