import { defineExtension, shallowRef, useActiveTextEditor, useCommands, watch } from 'reactive-vscode'
import { registerAutoComplete, unregisterAutoComplete } from './autocomplete'
import { config } from './config'
import { commands, extensionId } from './generated/meta'
import { ESLintConfigLoader } from './loader'
import { getCurWorkspaceDir, logger } from './utils'

const { activate, deactivate } = defineExtension(() => {
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

  const editor = useActiveTextEditor()
  watch(editor, async (value) => {
    if (!value)
      return

    const { document: doc } = value
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
  }, { immediate: true })

  watch(config.languageIds, () => {
    if (enable.value)
      registerAutoComplete()
  })

  useCommands({
    [commands.toggleAutoFix]() {
      config.$set('autocomplete', {
        ...config.autocomplete,
        autoFix: !config.autocomplete.autoFix,
      })
    },
  })
})

export { activate, deactivate }
