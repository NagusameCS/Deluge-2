import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // This ensures assets are loaded relative to index.html
    server: {
        host: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: 'index.html',
                editor: 'editor.html'
            }
        }
    }
})
