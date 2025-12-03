import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // Nécessaire pour GitHub Pages : le site est servi depuis /extremitehomme/
  base: '/extremitehomme/',
  build: {
    // On build dans /docs pour que GitHub Pages puisse servir le site depuis main/docs
    outDir: 'docs',
  },
})
