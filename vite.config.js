import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tmasha.github.io/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
