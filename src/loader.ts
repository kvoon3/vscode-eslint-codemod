import { ESLint } from 'eslint'
import * as vscode from 'vscode'
import { logger } from './utils'

export class ESLintConfigLoader {
  // private configCache = new Map<string, any>()

  async resolveConfig(cwd: string) {
    // if (this.configCache.has(cwd))
    //   return this.configCache.get(cwd)

    try {
      const eslint = new ESLint({
        cwd,
        // overrideConfigFile: true,
        fix: false,
      })

      const configPath = await eslint.findConfigFile()

      if (configPath) {
        const config = eslint.calculateConfigForFile(configPath)
        // this.configCache.set('cwd', config)
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
