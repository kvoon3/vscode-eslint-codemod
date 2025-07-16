import type { ESLint, Linter, Rule } from 'eslint'
import { basename } from 'node:path'
import process from 'node:process'
import { createPatch } from 'diff'
import { resolveModule } from 'local-pkg'
import { computed, useActiveTextEditor, watch } from 'reactive-vscode'
import { Position, Range } from 'vscode'
import { logger } from './log'
import { appendText, getCurWorkspaceDir } from './utils'

const activeEditor = useActiveTextEditor()
const activeFileName = computed(() => activeEditor.value?.document.fileName)

export const cwd = computed(() => activeEditor.value ? getCurWorkspaceDir(activeEditor.value.document) : undefined)
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

    eslintConfig = await import(configPath)
  }
  catch (error) {
    logger.error('error', error)
  }
}

export async function getLintDiff({ commandName, message }: { commandName: string, message: FixableLintMessage }): Promise<string | undefined> {
  if (!activeEditor.value)
    throw new Error('Cannot find active editor')

  const beforeRange = new Range(
    new Position(message.line - 1, message.column - 1),
    new Position(message.endLine - 1, message.endColumn - 1),
  )
  // FIXME: not much accurate for diff
  const { text } = message.fix
  const beforeText = activeEditor.value.document.getText(beforeRange)
  const patchString = createPatch(
    basename(activeFileName.value || ''),
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

export async function getFixableLintMessage(commandName: string): Promise<FixableLintMessage> {
  const editor = useActiveTextEditor()
  if (!editor.value)
    throw new Error('Cannot find active editor')

  if (!eslintConfig)
    throw new Error('Cannot find eslint config')

  if (!eslint)
    throw new Error('ESLint not loaded')

  const code = appendText(editor.value, commandName)

  const [result] = await eslint.lintText(code, {
    filePath: activeFileName.value || '',
    warnIgnored: true,
  })

  const commandMessages = result.messages.filter(i => i.ruleId === 'command/command')

  const message = commandMessages.find((i) => {
    return i.messageId === 'command-fix' && isFixableMessage(i)
  }) as FixableLintMessage | undefined

  if (!message) {
    const errmsg = commandMessages.find(
      i => ['command-error', 'command-error-cause'].includes(i.messageId || ''),
    )?.message || 'Unfixable command'

    throw new Error(errmsg)
  }

  return message
}

interface FixableLintMessage extends Linter.LintMessage {
  endColumn: number
  endLine: number
  fix: Rule.Fix
}

export function isFixableMessage(message?: Linter.LintMessage): message is FixableLintMessage {
  return Boolean(message && message.fix && message.endLine && message.endColumn)
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
