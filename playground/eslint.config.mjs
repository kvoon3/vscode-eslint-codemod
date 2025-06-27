import command from 'eslint-plugin-command/config'
import { builtinCommands } from 'eslint-plugin-command/commands'
import { defineConfig } from 'eslint/config'

const config = defineConfig([
  {
    files: ['src/*.ts'],
    rules: {
      'no-console': 'error'
    }
  },
  command({
    commands:[
      ...builtinCommands,
    ]
  })
])

export default config
