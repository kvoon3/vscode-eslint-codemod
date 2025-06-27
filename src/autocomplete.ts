import type { CompletionItemProvider, Disposable, TextEditor } from 'vscode'
import { objectKeys } from '@antfu/utils'
import { ofetch } from 'ofetch'
import { useActiveTextEditor, useDisposable, watch } from 'reactive-vscode'
import { CompletionItem, CompletionItemKind, CompletionList, languages, MarkdownString, SnippetString } from 'vscode'
import { config } from './config'
import { builtinCommandNames } from './generated/commands'
import { eslint } from './loader'
import { logger } from './utils'

const triggerConditionMap = {
  '@': /\/\//,
  ':': /\/\//,
  '/': /\/\/\//,
}

const triggerChars = objectKeys(triggerConditionMap)
type TriggerChar = keyof typeof triggerConditionMap

const provider: CompletionItemProvider = {
  provideCompletionItems(document, position, _, { triggerCharacter }) {
    function createCompletion(name: string): CompletionItem[] {
      const alias: string[] = []

      const genItem = (label: string) => {
        const line = document.lineAt(position.line).text.trim()

        const condition = triggerConditionMap?.[triggerCharacter as TriggerChar]
        if (!line.match(condition))
          throw new Error('Not matched')

        const item = new CompletionItem(label)
        item.filterText = label

        item.kind = CompletionItemKind.Snippet
        item.detail = [name, ...alias]
          .filter(i => i !== label)
          .sort((a, b) =>
            label === name
              ? a.length - b.length // prefer short alias
              : b.length - a.length, // prefer full name
          )
          .join(', ')

        // eslint-disable-next-line prefer-template
        const snippetLabel = ('${1:' + label + '}') // -> vscode snippet template: ${1: the-command-name}
        item.insertText = new SnippetString(snippetLabel)

        if (config.autocomplete.autoFix)
          item.command = { title: 'fix code', command: 'eslint.executeAutofix' }

        return item
      }

      return [name, ...alias].map(genItem)
    }

    try {
      const list = builtinCommandNames.flatMap(i => createCompletion(i.name))
      return new CompletionList(list, true)
    }
    catch {
      return new CompletionList()
    }
  },
  async resolveCompletionItem(item) {
    const label = typeof item.label === 'string'
      ? item.label
      : item.label.label

    function appendText(editor: TextEditor, text: string) {
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

    const editor = useActiveTextEditor()

    if (editor.value) {
      const textWithCurCommand = appendText(editor.value, label)
      const res = await eslint.value?.lintText(textWithCurCommand)
      if (res)
        logger.info('res', res[0].source)
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
