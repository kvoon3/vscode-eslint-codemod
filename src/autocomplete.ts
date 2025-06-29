import type { Command } from 'eslint-plugin-command/commands'
import type { CompletionItemProvider, Disposable } from 'vscode'
import { objectEntries } from '@antfu/utils'
import { builtinCommands } from 'eslint-plugin-command/commands'
import { useDisposable } from 'reactive-vscode'
import { CompletionItem, CompletionItemKind, CompletionList, CompletionTriggerKind, languages, MarkdownString, SnippetString } from 'vscode'
import { config } from './config'
import { configs } from './generated/meta'
import { getLintDiff } from './lint'
import { logger } from './log'
import { getMarkdownDocs } from './markdown'
import { isInsideBlockComment, isInsideLineComment } from './utils'

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
    const name = typeof item.label === 'string'
      ? item.label
      : item.label.label

    let fixable = ''
    let diffblock = ''
    let docs = ''

    try {
      const text = await getLintDiff(name).then(code => ['```diff', code, '```'].join(`\n`))
      diffblock = configs.autocompleteDiff
        ? text
        : 'Preview diff disabled.'

      fixable = '**✅ Fixable**'
    }
    catch (error: any) {
      logger.error('error', error)
      if (error?.message)
        fixable = `**❌ ${`${error.message}` as string}**`
    }

    if (!(config.autocomplete.docs)) {
      docs = `See <https://eslint-plugin-command.antfu.me/commands/${name}>`
    }
    else {
      try {
        docs = await getMarkdownDocs(name)
      }
      catch (error) {
        logger.error('error', error)
        docs = `See <https://eslint-plugin-command.antfu.me/commands/${name}>`
      }
    }

    const documentation = new MarkdownString([
      fixable,
      diffblock,
      '',
      docs,
    ].join('\n'))
    documentation.supportHtml = true

    return {
      ...item,
      documentation,
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
