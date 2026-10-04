import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Saving verification artifacts must not reload the page and rotate the test session.
  server: { watch: { ignored: ['**/verification/**/*.jpg', '**/verification/**/*.png', '**/verification/**/*.json', '**/verification/**/*.md'] } },
})
