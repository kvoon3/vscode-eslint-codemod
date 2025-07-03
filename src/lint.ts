import type { ESLint, Linter } from 'eslint'
import { basename } from 'node:path'
import process from 'node:process'
import { createPatch } from 'diff'
import { resolveModule } from 'local-pkg'
import { computed, useActiveTextEditor, watch } from 'reactive-vscode'
import { Position, Range } from 'vscode'
import { logger } from './log'
import { appendText, getCurWorkspaceDir, reject } from './utils'

const editor = useActiveTextEditor()

export const cwd = computed(() => editor.value ? getCurWorkspaceDir(editor.value.document) : undefined)
let eslintConfig: Linter.Config
let eslint: ESLint | undefined

const { stop } = watch(cwd, async (value) => {
  if (!value)
    return

  await updateLintConfig(value)
  stop()
}, { immediate: true })

export async function updateLintConfig(cwd?: string) {
  try {
    if (!cwd)
      throw new Error('Unknown cwd')

    // change vscode cwd to actual project cwd
    process.chdir(cwd)

    const { ESLint } = await getESLintModule()
    eslint = new ESLint({ cwd, fix: false, cache: false })
    const configPath = await eslint.findConfigFile()

    if (!configPath)
      throw new Error('Cannot find eslint config file')

    eslintConfig = await import('importx').then(x => x.import(configPath, {
      parentURL: cwd,
      cache: false,
    }))
  }
  catch (error) {
    logger.error('error', error)
  }
}

export async function getLintDiff(commandName: string): Promise<string | undefined> {
  const editor = useActiveTextEditor()
  if (!editor.value)
    return reject('Cannot find active editor')

  if (!eslintConfig)
    return reject('Cannot find eslint config')

  if (!eslint)
    return reject('ESLint not loaded')

  const code = appendText(editor.value, commandName)

  const filePath = editor.value.document.fileName
  const filename = basename(filePath)

  const [result] = await eslint.lintText(code, {
    filePath,
    warnIgnored: true,
  })

  const commandMessages = result.messages.filter(i => i.ruleId === 'command/command')

  const errMsg = commandMessages.find(i => ['command-error', 'command-error-cause'].includes(i.messageId || ''))?.message
  if (errMsg)
    return reject(errMsg)

  const message = commandMessages.find(i => i.messageId === 'command-fix')

  if (
    !message?.fix
    || !message.endLine
    || !message.endColumn
  ) {
    // unfixable but log it in vscode output
    logger.log('result', result)
    return undefined
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
