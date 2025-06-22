import type { Command } from 'eslint-plugin-command/commands'
import type { CompletionItemProvider, Disposable } from 'vscode'
import { objectKeys } from '@antfu/utils'
import { builtinCommands } from 'eslint-plugin-command/commands'
import { ofetch } from 'ofetch'
import { useDisposable } from 'reactive-vscode'
import { CompletionItem, CompletionItemKind, CompletionList, languages, MarkdownString, SnippetString } from 'vscode'
import { config } from './config'
import { logger } from './utils'

const triggerConditionMap = {
  '@': /\/\//,
  '/': /\/\/\//,
}

const triggerChars = objectKeys(triggerConditionMap)
type TriggerChar = keyof typeof triggerConditionMap

const provider: CompletionItemProvider = {
  provideCompletionItems(document, position, _, { triggerCharacter }) {
    function createCompletion(command: Command): CompletionItem[] {
      const {
        name,
        // @ts-expect-error unsupported
        alias = [],
      } = command

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
      const list = builtinCommands.flatMap(createCompletion)
      return new CompletionList(list, true)
    }
    catch {
      return new CompletionList()
    }
  },
  async resolveCompletionItem(item) {
    const getContent = async () => {
      // @ts-expect-error unsupported
      const { name } = builtinCommands.find(i => [i.name, ...(i?.alias || [])].includes(item.label as string))!
      try {
        const content = await ofetch(`https://raw.githubusercontent.com/antfu/eslint-plugin-command/refs/heads/main/src/commands/${name}.md`)
        return new MarkdownString(content)
      }
      catch (error) {
        logger.error('error', error)
      }
    }
    getContent()

    return {
      ...item,
      documentation: await getContent(),
    }
  },
}

let completionDisposable: Disposable | null = null
export function registerAutoComplete() {
  if (completionDisposable) {
    completionDisposable.dispose()
    completionDisposable = null
  }

  completionDisposable = useDisposable(languages.registerCompletionItemProvider(
    config.languageIds,
    provider,
    ...triggerChars,
  ))
}
