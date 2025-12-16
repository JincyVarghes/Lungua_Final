
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // CRITICAL: Ensures assets load correctly on GitHub Pages or phone file systems
  server: {
    host: true,
    port: 5173,
  }
})
