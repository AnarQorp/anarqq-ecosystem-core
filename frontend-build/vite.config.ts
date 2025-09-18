
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { fileURLToPath } from 'url';
import { componentTagger } from "lovable-tagger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const rootDir = path.resolve(__dirname, '..');

// Import Tailwind CSS and Autoprefixer at the top level
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import type { UserConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }): UserConfig => {
  // Load env file based on `mode` in the current directory and its parent dirs.
  const env = loadEnv(mode, process.cwd(), '');

  // Expone las variables de entorno con prefijo VITE_ al frontend
  const envWithProcessPrefix: Record<string, string> = {};
  
  // Only include VITE_ prefixed variables and some specific ones
  Object.keys(env).forEach(key => {
    if (key.startsWith('VITE_') || ['NODE_ENV', 'PORT'].includes(key)) {
      envWithProcessPrefix[`process.env.${key}`] = JSON.stringify(env[key]);
    }
  });

  return {
    define: {
      // Prevents conflicts with browser extensions
      'window.global': 'window',
      // Stringify the environment variables to prevent undefined errors
      ...envWithProcessPrefix,
      // Add global process shim
      'process.env.NODE_ENV': `"${mode}"`,
      'process.platform': '"browser"',
      'process.version': '""',
    },
    plugins: [
      tsconfigPaths(),
      react({
        // Add React refresh configuration
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin']
        }
      }),
      ...(mode === 'development' ? [componentTagger() as any] : []),
    ],
    base: '/',
    css: {
      // Enable CSS modules
      modules: {
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
      postcss: './postcss.config.cjs',
      // Ensure CSS is properly extracted and inlined
      devSourcemap: true,
    },
    // Ensure proper handling of browser globals and resolution
    optimizeDeps: {
      esbuildOptions: {
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis',
        },
      },
      include: [
        'lucide-react',
        'clsx',
        'react',
        'react-dom'
      ]
    },
    resolve: {
      alias: {
        // Ensure single React instance
        'react': path.resolve('./node_modules/react'),
        'react-dom': path.resolve('./node_modules/react-dom'),
        '@': path.resolve(rootDir, 'src'),
      },
    },
    root: rootDir,
    build: {
      outDir: path.resolve(rootDir, 'dist'),
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar']
          }
        }
      }
    },
    server: {
      host: "::",
      port: 3000,
      strictPort: false,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/api/, '/api')
        },
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/auth/, '/auth')
        }
      }
    }
  }
})
