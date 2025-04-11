import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    var env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: env.VITE_API_URL || 'http://localhost:4000',
                    changeOrigin: true,
                    secure: mode === 'production',
                },
            },
        },
        define: {
            // Expose env variables to the client
            'process.env.VITE_NODE_ENV': JSON.stringify(env.VITE_NODE_ENV),
            'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
            'process.env.VITE_HYPERLIQUID_API_URL': JSON.stringify(env.VITE_HYPERLIQUID_API_URL),
        },
    };
});
