import { defineExtension, shallowRef, useActiveTextEditor, useCommands, watch } from 'reactive-vscode'
import { registerAutoComplete, unregisterAutoComplete } from './autocomplete'
import { config } from './config'
import { commands, extensionId } from './generated/meta'
import { resolveLintConfig } from './lint'
import { getCurWorkspaceDir, logger } from './utils'

const { activate, deactivate } = defineExtension(() => {
  logger.show()
  logger.info(`${extensionId} activated`)

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

      enable.value = !!(await resolveLintConfig(cwd))
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
