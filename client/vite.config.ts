import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Origin for dev/preview `/api` proxy (strip path when VITE_API_URL is absolute). */
function apiProxyTarget(env: Record<string, string>): string {
  const raw = env.VITE_API_URL?.trim();
  if (!raw || raw.startsWith("/")) {
    return "http://localhost:3000";
  }
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

const apiProxy = (env: Record<string, string>) => ({
  "/api": {
    target: apiProxyTarget(env),
    changeOrigin: true,
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: apiProxy(env),
    },
    preview: {
      port: 4173,
      proxy: apiProxy(env),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            // Add other large dependencies here if needed
          },
        },
      },
      // Ensure proper cache busting
      assetsDir: "assets",
      // Generate manifest for better cache control
      manifest: true,
      sourcemap: false,
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
    },
  };
});
