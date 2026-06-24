import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const DEFERRED_PRELOAD_CHUNKS = [
  'vendor-export',
  'vendor-pdf',
  'vendor-socket',
  'vendor-supabase',
  'DashboardShell',
  'OTPVerification',
  'vendor-stripe',
];

export default defineConfig(({ mode }) => {
  const analyze = mode === 'analyze';

  return {
    server: {
      port: 5173,
      host: '0.0.0.0',
      historyApiFallback: true,
    },
    plugins: [
      react(),
      analyze &&
        visualizer({
          open: false,
          filename: 'dist/bundle-stats.html',
          gzipSize: true,
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      modulePreload: {
        resolveDependencies(_filename, deps, { hostId }) {
          if (hostId.includes('DashboardShell')) return deps;
          return deps.filter(
            (dep) => !DEFERRED_PRELOAD_CHUNKS.some((chunk) => dep.includes(chunk)),
          );
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('framer-motion') || id.includes('lucide-react')) return 'vendor-ui';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('socket.io')) return 'vendor-socket';
            if (id.includes('@stripe')) return 'vendor-stripe';
            if (id.includes('pdfjs-dist')) return 'vendor-pdf';
            if (
              id.includes('xlsx') ||
              id.includes('jspdf') ||
              id.includes('html2canvas')
            ) {
              return 'vendor-export';
            }
          },
        },
      },
    },
  };
});
