import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: ['cjs'],
  clean: true,
  splitting: true,
  esbuildOptions: (options) => {
    // See: https://github.com/eslint/eslint/issues/15065
    options.mainFields = ['main', 'module']
  },
  dts: false,
  external: [
    'vscode',
  ],
})
