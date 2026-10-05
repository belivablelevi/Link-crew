import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' keeps the build portable (GitHub Pages, school web hosts, etc.)
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
