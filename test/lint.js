/* eslint-disable no-console */
import { cwd } from 'node:process'
import { ESLint, Linter } from 'eslint'

const code = `
const a = 1
const b = 2 * 4

/// reverse-if-else
if (a === b)
  console.error(123)
else
  console.error(456)
`

/**
 *
 * @param {string} cwd
 */
async function run(cwd) {
  const configFile = await new ESLint({ cwd }).findConfigFile()
  const config = await import(configFile).then(i => i.default)
  // const c = config.find(i => i.name.includes('command'))
  // console.log('config.', JSON.stringify(c, null, 2))

  const linter = new Linter({ cwd })

  // const res = linter.verify(code, config, 'example.ts')
  const res = linter.verify(code.trim(), config)
  console.log('res', res)
}

run(cwd())
