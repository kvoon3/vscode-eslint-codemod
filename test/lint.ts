/* eslint-disable no-console */
import { ESLint } from 'eslint'

const code = `
const a: number = 1
const b = 2 * 4

/// reverse-if-else
if (a === b)
  console.error(123)
else
  console.error(456)
`

async function run() {
  // @ts-expect-error type
  const config = await import('../playground/eslint.config.mjs').then(i => i.default)
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  })
  try {
    const res = await eslint.lintText(code, {
      filePath: 'test.ts',
      warnIgnored: true,
    })
    console.log('res', JSON.stringify(res, null, 2))
  }
  catch (error) {
    console.error('error', error)
  }
}

run()
