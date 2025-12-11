import { defineConfig } from 'vite'

export default defineConfig({
    base: '/Deluge-2/', // Base path for GitHub Pages (repo name)
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
