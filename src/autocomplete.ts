import type { Command } from 'eslint-plugin-command/commands'
import type { CompletionItemProvider, Disposable, TextDocument, TextEditor } from 'vscode'
import { objectEntries } from '@antfu/utils'
import { ESLint, Linter } from 'eslint'
import { builtinCommands } from 'eslint-plugin-command/commands'
import { ofetch } from 'ofetch'
import { useActiveTextEditor, useDisposable, useTextEditorSelection, watch } from 'reactive-vscode'
import { CompletionItem, CompletionItemKind, CompletionList, CompletionTriggerKind, languages, MarkdownString, Position, Range, SnippetString } from 'vscode'
import { config } from './config'
import { getCurWorkspaceDir, logger } from './utils'

interface Trigger {
  char: '/' | '@' | ':'
  condition: () => boolean
}

const lineTriggers: Trigger[] = [
  ///
  { char: '/', condition: () => isInsideLineComment('///') },
  // :
  { char: ':', condition: isInsideLineComment },
  // @
  { char: '@', condition: isInsideLineComment },
]

const blockTriggers: Trigger[] = [
  /** @ */
  { char: '@', condition: isInsideBlockComment },
]

type CommentType = Exclude<Command['commentType'], undefined>

const commentTriggerMap: Record<CommentType, Trigger[]> = {
  line: lineTriggers,
  block: blockTriggers,
  both: [
    ...lineTriggers,
    ...blockTriggers,
  ],
}

const triggerChars = objectEntries(commentTriggerMap).flatMap(([_, triggerInfo]) => triggerInfo.map(info => info.char))
// type TriggerChar = typeof triggerChars[number]

let triggerChar: string | undefined
const provider: CompletionItemProvider = {
  provideCompletionItems(_document, _position, _, { triggerCharacter, triggerKind }) {
    if (triggerKind === CompletionTriggerKind.TriggerCharacter)
      triggerChar = triggerCharacter

    function createCompletion(command: Command): CompletionItem[] {
      const { name, commentType = 'line' } = command
      const alias: string[] = []

      const items: CompletionItem[] = []

      const genItem = (label: string): CompletionItem | undefined => {
        const triggers = commentTriggerMap[commentType]
        const genAble = triggers.some(trigger => triggerChar === trigger.char && trigger.condition())

        if (!genAble)
          return

        const item = new CompletionItem(label)
        item.filterText = label

        item.kind = CompletionItemKind.Snippet
        item.detail = commentType

        // TODO: support alias
        // item.detail = [name, ...alias]
        //   .filter(i => i !== label)
        //   .sort((a, b) =>
        //     label === name
        //       ? a.length - b.length // prefer short alias
        //       : b.length - a.length, // prefer full name
        //   )
        //   .join(', ')

        // eslint-disable-next-line prefer-template
        const snippetLabel = ('${1:' + label + '}') // -> vscode snippet template: ${1: the-command-name}
        item.insertText = new SnippetString(snippetLabel)

        if (config.autocomplete.autoFix)
          item.command = { title: 'fix code', command: 'eslint.executeAutofix' }

        return item
      }

      for (const label of [name, ...alias]) {
        const item = genItem(label)
        if (item)
          items.push(item)
      }

      return items
    }

    try {
      const list = builtinCommands.flatMap(i => createCompletion(i))
      return new CompletionList(list, true)
    }
    catch (error) {
      logger.error('error', error)
    }
  },
  async resolveCompletionItem(item) {
    const label = typeof item.label === 'string'
      ? item.label
      : item.label.label

    const editor = useActiveTextEditor()

    try {
      if (editor.value) {
        const code = appendText(editor.value, label)
        const cwd = getCurWorkspaceDir(editor.value.document)
        const eslint = new ESLint({ cwd })
        // const res = await eslint.lintText(code, {
        //   filePath: editor.value.document.fileName
        // })
        const configFile = await eslint.findConfigFile()
        if (configFile) {
          const config = await import(configFile).then(i => i.default)
          const linter = new Linter({ cwd })

          // FIXME: cannot lint code
          linter.verify(code, config, 'example.js')
          // const res = await eslint.lintText(code)
          // const res = linter.value.verify(code, lintConfig.value, 'example.ts')
          // logger.log('res', res)
        }
      }
      else {
        logger.info('editor.value', editor.value)
      }
    }
    catch (error) {
      logger.info('error', error)
      logger.log('error', error)
    }

    return {
      ...item,
      documentation: new MarkdownString(await getContent(label)),
    }
  },
}

let completionDisposable: Disposable | null = null
export function registerAutoComplete() {
  unregisterAutoComplete()

  completionDisposable = useDisposable(languages.registerCompletionItemProvider(
    config.languageIds,
    provider,
    ...triggerChars,
  ))
}

export function unregisterAutoComplete() {
  if (completionDisposable) {
    completionDisposable.dispose()
    completionDisposable = null
  }
}

const cachedContent = new Map<string, string>()
watch(() => config.autocomplete.docs, () => {
  cachedContent.clear()
})
async function getContent(name: string) {
  if (cachedContent.has(name))
    return cachedContent.get(name)

  try {
    let content: string
    if (config.autocomplete.docs)
      content = await ofetch(`https://raw.githubusercontent.com/antfu/eslint-plugin-command/refs/heads/main/src/commands/${name}.md`)
    else
      content = `See https://eslint-plugin-command.antfu.me/commands/${name}`

    cachedContent.set(name, content)
    return content
  }
  catch (error) {
    logger.error('error', error)
    return `See https://eslint-plugin-command.antfu.me/commands/${name}`
  }
}

export function appendText(editor: TextEditor, text: string) {
  const document = editor.document
  const line = document.lineAt(editor.selection.active.line)

  const RE = /(\/\/\/\s*).*/
  const newLine = line.text.replace(RE, `$1${text}`)

  // Replace the entire line in document text
  const fullText = document.getText()
  const beforeLines = fullText.split('\n').slice(0, line.lineNumber).join('\n')
  const afterLines = fullText.split('\n').slice(line.lineNumber + 1).join('\n')

  return [beforeLines, newLine, afterLines].filter(s => s !== '').join('\n')
}

export function getSurroundTextBlock(document: TextDocument, position: Position) {
  const curline = position.line
  const block: string[] = []

  for (let index = curline - 1; index >= 1; index--) {
    const text = document.lineAt(index).text
    if (!text.trim())
      break

    block.unshift(text)
  }

  block.push(document.lineAt(curline).text)

  for (let index = curline + 1; index <= document.lineCount; index++) {
    const text = document.lineAt(index).text
    if (!text.trim())
      break

    block.push(text)
  }

  return block.join('\n')
}

export function isInsideBlockComment(): boolean {
  const editor = useActiveTextEditor()

  if (!editor.value)
    return false

  const selection = useTextEditorSelection(editor.value)
  const textBeforeCursor = editor.value.document.getText(new Range(new Position(0, 0), selection.value.active))

  const openComments = (textBeforeCursor.match(/\/\*/g) || []).length
  const closeComments = (textBeforeCursor.match(/\*\//g) || []).length

  return openComments > closeComments
}

export function isInsideLineComment(commentText = '//'): boolean {
  const editor = useActiveTextEditor()

  if (!editor.value)
    return false

  const selection = useTextEditorSelection(editor.value)
  const cursorPosition = selection.value.active
  const currentLineText = editor.value.document.lineAt(cursorPosition.line).text
  const lineBeforeCursor = currentLineText.substring(0, cursorPosition.character)
  const openStringLiterals = (lineBeforeCursor.match(/"/g) || []).length % 2 !== 0
  const lastLineCommentIndex = lineBeforeCursor.lastIndexOf(commentText)

  return lastLineCommentIndex !== -1 && !openStringLiterals
}
