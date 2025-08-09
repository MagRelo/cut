import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    var env = loadEnv(mode, process.cwd(), "");
    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                "/api": {
                    target: env.VITE_API_URL || "http://localhost:3000",
                    changeOrigin: true,
                    secure: mode === "production",
                },
            },
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
            // Enable source maps in production for better debugging
            sourcemap: mode === "production",
            // Optimize chunk size
            chunkSizeWarningLimit: 1000,
        },
        define: {
            // Expose env variables to the client
            "process.env.VITE_NODE_ENV": JSON.stringify(env.VITE_NODE_ENV),
            "process.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL),
        },
    };
});
