import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __HMR_CONFIG_NAME__: JSON.stringify('vite.config.js')
  },
  server: {
    host: '0.0.0.0', // Allow connections from any IP
    port: 5173,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 3000
    },
    watch: {
      usePolling: true
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})
