import { ESLint } from 'eslint'
import { shallowRef } from 'reactive-vscode'
import * as vscode from 'vscode'
import { logger } from './utils'

export const eslint = shallowRef<ESLint | undefined>(undefined)

export class ESLintConfigLoader {
  async resolveConfig(cwd: string) {
    try {
      eslint.value = new ESLint({
        cwd,
        fix: false,
      })

      const configPath = await eslint.value.findConfigFile()

      if (configPath) {
        const config = eslint.value.calculateConfigForFile(configPath)
        return config
      }
      else {
        logger.info('No config founded')
      }
    }
    catch (error) {
      vscode.window.showErrorMessage(`ESLint config load failed: ${error}`)
      return null
    }
  }
}
