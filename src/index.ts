import { computed, defineExtension, useCommands, useFsWatcher, watch, watchEffect } from 'reactive-vscode'
import { registerAutoComplete, unregisterAutoComplete } from './autocomplete'
import { config } from './config'
import { commands, extensionId } from './generated/meta'
import { cwd, updateLintConfig } from './lint'
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

  const watcher = useFsWatcher([
    '**/eslint.config.{js,ts}',
    '**/eslint.config.{mjs,cjs}',
    '**/eslint.config.{mts,cts}',
  ])

  watcher.onDidChange(() => updateLintConfig(cwd.value))
  watcher.onDidCreate(() => updateLintConfig(cwd.value))
  watcher.onDidDelete(() => updateLintConfig(cwd.value))

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
