import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
    plugins: [react(), cloudflare()],

    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3001',
                changeOrigin: true,
            }
        }
    },

    build: {
        // Vendor chunk splitting for better caching
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'supabase': ['@supabase/supabase-js'],
                    'icons': ['lucide-react'],
                }
            }
        },

        // Split CSS per chunk (route-level CSS)
        cssCodeSplit: true,

        // Inline small assets (< 8KB)
        assetsInlineLimit: 8192,

        // No source maps in production
        sourcemap: false,
    }
})