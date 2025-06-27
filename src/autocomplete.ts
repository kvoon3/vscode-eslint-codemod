import type { CompletionItemProvider, Disposable } from 'vscode'
import { objectKeys } from '@antfu/utils'
import { ofetch } from 'ofetch'
import { useDisposable } from 'reactive-vscode'
import { CompletionItem, CompletionItemKind, CompletionList, languages, MarkdownString, SnippetString } from 'vscode'
import { config } from './config'
import { builtinCommandNames } from './generated/commands'
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
    const name = typeof item.label === 'string'
      ? item.label
      : item.label.label

    return {
      ...item,
      documentation: new MarkdownString(await getContent(name)),
    }
  },
}

let completionDisposable: Disposable | null = null
export function registerAutoComplete(languageIds: string[]) {
  unregisterAutoComplete()

  completionDisposable = useDisposable(languages.registerCompletionItemProvider(
    languageIds,
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
async function getContent(name: string) {
  if (cachedContent.has(name))
    return cachedContent.get(name)

  try {
    const content = await ofetch(`https://raw.githubusercontent.com/antfu/eslint-plugin-command/refs/heads/main/src/commands/${name}.md`)
    cachedContent.set(name, content)
    return content
  }
  catch (error) {
    logger.error('error', error)
    return `See https://eslint-plugin-command.antfu.me/commands/${name}`
  }
}
