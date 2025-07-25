// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    pnpm: false,
    typescript: true,
    ignores: [
      // eslint ignore globs here
    ],
  },
  {
    rules: {
      // overrides
    },
  },
).append(
  {
    files: ['example.ts'],
    rules: {
      'no-console': 'off',
      'prefer-template': 'off',
      'prefer-const': 'off',
      'style/quote-props': 'off',
      'style/no-multiple-empty-lines': 'off',
      'style/type-generic-spacing': 'off',
    },
  },
)
