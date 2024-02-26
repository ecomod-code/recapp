import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { lingui } from "@lingui/vite-plugin";
import styleX from "vite-plugin-stylex";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), lingui(), styleX()],
});
