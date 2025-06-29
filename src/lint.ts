import { basename } from 'node:path'
import { createPatch } from 'diff'
import { ESLint } from 'eslint'
import { computed, shallowRef, useActiveTextEditor, watchEffect } from 'reactive-vscode'
import { Position, Range } from 'vscode'
import { logger } from './log'
import { appendText, getCurWorkspaceDir } from './utils'

const editor = useActiveTextEditor()

export const cwd = computed(() => editor.value ? getCurWorkspaceDir(editor.value.document) : undefined)
export const eslintConfig = shallowRef<any>(undefined)

watchEffect(() => updateLintConfig(cwd.value))

export async function updateLintConfig(cwd?: string) {
  if (!cwd)
    return

  const eslint = new ESLint({ cwd, fix: false })
  const configPath = await eslint.findConfigFile()

  if (configPath) {
    eslintConfig.value = await import(configPath)
      .then(i => i.default)
      .catch(error => logger.error('error', error))
  }
  else {
    return Promise.reject(new Error('Cannot find config file'))
  }
}

export async function getLintDiff(commandName: string) {
  const editor = useActiveTextEditor()
  if (!editor.value)
    return

  if (!eslintConfig.value) {
    return 'Cannot find eslint config'
  }

  const code = appendText(editor.value, commandName)

  const eslint = new ESLint({
    cwd: cwd.value,
    overrideConfigFile: true,
    overrideConfig: eslintConfig.value,
  })

  const filePath = editor.value.document.fileName
  const filename = basename(filePath)

  const [result] = await eslint.lintText(code, {
    filePath,
    warnIgnored: true,
  })

  const message = result.messages.find(i => i.ruleId === 'command/command')
  logger.log('result', result)
  logger.log('message', message)

  if (!message?.fix) {
    return '[Command] unfixable'
  }
  if (!message.endLine || !message.endColumn) {
    return '[Command] No available code find'
  }

  const beforeRange = new Range(
    new Position(message.line - 1, message.column - 1),
    new Position(message.endLine - 1, message.endColumn - 1),
  )
  const { text } = message.fix
  const beforeText = editor.value.document.getText(beforeRange)
  const patchString = createPatch(
    basename(filename),
    beforeText.trim(),
    text.trim(),
    'current code',
    commandName,
    {
      ignoreWhitespace: true,
    },
  )

  return patchString
}
