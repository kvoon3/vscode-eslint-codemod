import type { ESLint } from 'eslint'
import { basename } from 'node:path'
import { createPatch } from 'diff'
import { resolveModule } from 'local-pkg'
import { computed, shallowRef, useActiveTextEditor, watchEffect } from 'reactive-vscode'
import { Position, Range } from 'vscode'
import { logger } from './log'
import { appendText, getCurWorkspaceDir, reject } from './utils'

const editor = useActiveTextEditor()

export const cwd = computed(() => editor.value ? getCurWorkspaceDir(editor.value.document) : undefined)
export const eslintConfig = shallowRef<any>(undefined)

watchEffect(() => updateLintConfig(cwd.value))

export async function updateLintConfig(cwd?: string) {
  try {
    if (!cwd)
      throw new Error('Unknown cwd')

    const { ESLint } = await getESLintModule()
    const eslint = new ESLint({ cwd, fix: false })
    const configPath = await eslint.findConfigFile()

    if (!configPath)
      throw new Error('Cannot find eslint config file')

    eslintConfig.value = await import(configPath).then(i => i.default)
  }
  catch (error) {
    logger.error('error', error)
  }
}

export async function getLintDiff(commandName: string) {
  const editor = useActiveTextEditor()
  if (!editor.value)
    return reject('Cannot find active editor')

  if (!eslintConfig.value) {
    return reject('Cannot find eslint config')
  }

  const code = appendText(editor.value, commandName)

  const { ESLint } = await getESLintModule()
  const eslint: ESLint = new ESLint({
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
  if (!message) {
    return reject('Unfixable')
  }

  if (!message.fix) {
    return reject(message.message || 'Unfixable')
  }
  if (!message.endLine || !message.endColumn) {
    return reject('No available code find')
  }

  const beforeRange = new Range(
    new Position(message.line - 1, message.column - 1),
    new Position(message.endLine - 1, message.endColumn - 1),
  )
  // FIXME: not much accurate for diff
  const { text } = message.fix
  const beforeText = editor.value.document.getText(beforeRange)
  const patchString = createPatch(
    filename,
    beforeText.trim(),
    text.trim(),
    'old',
    `new (${commandName})`,
    {
      ignoreWhitespace: true,
    },
  )

  return patchString
}

async function getESLintModule() {
  if (!cwd.value)
    throw new Error('Unknown cwd')

  const modulePath = resolveModule('eslint', { paths: [cwd.value] })

  if (!modulePath)
    throw new Error('Cannot find eslint module')

  const module = await import(modulePath)
  return module as { ESLint: new (options: ESLint.Options) => ESLint }
}
