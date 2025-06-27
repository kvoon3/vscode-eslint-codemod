import { ESLint } from 'eslint'
import * as vscode from 'vscode'
import { logger } from './utils'

export class ESLintConfigLoader {
  async resolveConfig(cwd: string) {
    try {
      const eslint = new ESLint({
        cwd,
        fix: false,
      })

      const configPath = await eslint.findConfigFile()

      if (configPath) {
        const config = eslint.calculateConfigForFile(configPath)
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
