import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
    server: {
        host: '127.0.0.1',
        port: 5173,
    },
    plugins: [
        laravel({
            input: ['resources/js/main.jsx'],
            refresh: true,
        }),
        react(),
        VitePWA({
            // Laravel publishes Vite assets below /build, while the app itself
            // is served from /. Keep generated PWA URLs aligned with that path.
            buildBase: '/build/',
            registerType: 'prompt',
            scope: '/',
            includeAssets: ['icons/*.svg', 'icons/*.png', 'favicon.ico'],
            manifest: {
                name: 'BazarNet - Business Management',
                short_name: 'BazarNet',
                description: 'Business management application for purchases, sales, inventory, and more.',
                theme_color: '#007c89',
                background_color: '#f8fafc',
                display: 'standalone',
                orientation: 'any',
                scope: '/',
                start_url: '/',
                categories: ['business', 'finance', 'productivity'],
                icons: [
                    {
                        src: '/icons/icon-72x72.png',
                        sizes: '72x72',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-96x96.png',
                        sizes: '96x96',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-128x128.png',
                        sizes: '128x128',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-144x144.png',
                        sizes: '144x144',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-384x384.png',
                        sizes: '384x384',
                        type: 'image/png',
                    },
                    {
                        src: '/icons/icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/maskable-icon-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot}'],
                // offline.html lives in Laravel's public root, outside Vite's
                // build directory, so it must be explicitly precached.
                additionalManifestEntries: [
                    { url: '/offline.html', revision: null },
                ],
                navigateFallback: '/offline.html',
                navigateFallbackDenylist: [/^\/api\//, /^\/login/, /^\/company-admin/],
                runtimeCaching: [
                    {
                        urlPattern: /^https?:\/\/.*\/api\/publications\/public$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-publications',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 5 * 60,
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /^https?:\/\/.*\/api\/products\/\d+\/likes/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-likes',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 5 * 60,
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /^https?:\/\/.*\/api\/products\/\d+\/comments/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-comments',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 5 * 60,
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /^https?:\/\/.*\/api\/orders/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-orders',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 5 * 60,
                            },
                            networkTimeoutSeconds: 3,
                        },
                    },
                    {
                        urlPattern: /\.(?:png|gif|jpg|jpeg|webp|svg)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'images',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 30 * 24 * 60 * 60,
                            },
                        },
                    },
                    {
                        urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'fonts',
                            expiration: {
                                maxEntries: 20,
                                maxAgeSeconds: 365 * 24 * 60 * 60,
                            },
                        },
                    },
                    {
                        urlPattern: /^https?:\/\/.*\/api\//,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 5 * 60,
                            },
                            networkTimeoutSeconds: 5,
                        },
                    },
                ],
            },
            devOptions: {
                enabled: false,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
            '@css': path.resolve(__dirname, 'resources/css'),
        },
    },
    css: {
        postcss: './postcss.config.js',
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', 'react-is'],
                    charts: ['chart.js', 'recharts'],
                    ui: ['@headlessui/react', '@heroicons/react', 'lucide-react'],
                    utils: ['axios', 'js-cookie', 'i18next', 'react-i18next'],
                    pkg: ['html2canvas', 'sweetalert2'],
                },
            },
        },
    },
});
