import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
  ],
  format: ['cjs'],
  shims: false,
  clean: true,
  splitting: true,
  dts: false,
  external: [
    'vscode',
  ],
})
