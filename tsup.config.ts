import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  minify: false,
  format: ['cjs'],
  shims: false,
  dts: false,
  external: [
    'vscode',
  ],
})
