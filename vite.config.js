import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 請將下方字串替換為你在 GitHub 上的 Repo 名稱，例如 "/MyRead/"
  base: '/MyRead/',
})
