import vinext from "vinext";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const usePolling = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig({
  server: usePolling ? { watch: { useFsEvents: false, usePolling: true } } : undefined,
  plugins: [vinext(), nitro()],
});
