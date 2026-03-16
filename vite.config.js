import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Use mkcert certs if available for HTTPS dev server (required for AudioWorklet on mobile)
function getHttpsConfig() {
  const certDir = path.join(process.env.HOME || '', '.vite-certs')
  const key = path.join(certDir, 'key.pem')
  const cert = path.join(certDir, 'cert.pem')
  if (fs.existsSync(key) && fs.existsSync(cert)) {
    return { key: fs.readFileSync(key), cert: fs.readFileSync(cert) }
  }
  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https: getHttpsConfig(),
  },
})
