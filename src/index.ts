import { defineExtension, shallowRef, useCommands, watch } from 'reactive-vscode'
import * as vscode from 'vscode'
import { registerAutoComplete, unregisterAutoComplete } from './autocomplete'
import { config, watchConfig } from './config'
import { commands, extensionId } from './generated/meta'
import { ESLintConfigLoader } from './loader'
import { getCurWorkspaceDir, logger } from './utils'

const { activate, deactivate } = defineExtension((ctx) => {
  logger.info(`${extensionId} activated`)

  const loader = new ESLintConfigLoader()

  const enable = shallowRef(false)

  watch(enable, (value) => {
    if (value) {
      registerAutoComplete()
    }
    else {
      unregisterAutoComplete()
    }
  })

  ctx.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (doc) => {
      try {
        const cwd = getCurWorkspaceDir(doc)
        if (!cwd)
          return

        const config = await loader.resolveConfig(cwd)
        if (!config)
          return

        const commandConfig = config.plugins?.command
        const hasESLintPluginCommand = enable.value = commandConfig && commandConfig?.meta?.name === 'command'
        logger.info('hasESLintPluginCommand', hasESLintPluginCommand)
      }
      catch (error) {
        logger.error('error', error)
      }
    }),
  )

  watchConfig('eslintCodemod.languageIds', () => {
    if (enable.value)
      registerAutoComplete()
  }, { immediate: true })

  useCommands({
    [commands.toggleAutoFix]() {
      config.$set('autocomplete', {
        autoFix: !config.autocomplete.autoFix,
      })
    },
  })
})

export { activate, deactivate }
