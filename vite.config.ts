import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@reactflow/core',
      '@reactflow/background',
      '@reactflow/controls',
      '@reactflow/minimap'
    ],
  },
});