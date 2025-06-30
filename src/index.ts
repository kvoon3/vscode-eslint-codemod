import { computed, defineExtension, useCommands, watch, watchEffect } from 'reactive-vscode'
import { registerAutoComplete, unregisterAutoComplete } from './autocomplete'
import { config } from './config'
import { commands, extensionId } from './generated/meta'
import { logger } from './log'

const { activate, deactivate } = defineExtension(() => {
  logger.info(`${extensionId} activated`)

  const enable = computed(() => config.enable)

  watchEffect(() => {
    enable.value
      ? registerAutoComplete()
      : unregisterAutoComplete()
  })

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
