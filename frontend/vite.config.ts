import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const maxWorkers = process.env.CI ? 1 : 4;

  return {
    plugins: [react()],
    test: {
      environment: "jsdom",
      minWorkers: 1,
      maxWorkers,
      setupFiles: ["./src/setupTests.ts"],
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_DEV_PROXY_TARGET || "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
  };
});
