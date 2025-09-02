import { defineConfig } from 'tsup';
import type { Options } from 'tsup';

export default defineConfig((options: Options) => {
  const isDev = !!options.watch;
  
  return {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: {
      resolve: true,
      entry: 'src/index.ts',
      compilerOptions: {
        moduleResolution: 'node',
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        target: 'es2018',
        module: 'esnext',
        declaration: true,
        outDir: 'dist',
        rootDir: 'src',
        baseUrl: '.',
        paths: {
          '@anarq/common': ['../../node_modules/@anarq/common']
        }
      }
    },
    sourcemap: isDev,
    clean: true,
    minify: !isDev,
    external: ['mongoose'],
    target: 'es2018',
    outDir: 'dist',
    tsconfig: './tsconfig.build.json',
    bundle: true,
    noExternal: [],
    keepNames: true,
    splitting: false,
    minifyWhitespace: !isDev,
    minifyIdentifiers: !isDev,
    minifySyntax: !isDev,
    onSuccess: isDev ? 'echo \"Build successful!\"' : undefined,
    watch: isDev ? 'src/**/*' : false
  };
});
