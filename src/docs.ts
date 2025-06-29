import { ofetch } from 'ofetch'
import { watch } from 'reactive-vscode'
import { config } from './config'
import { logger } from './log'

const cachedContent = new Map<string, string>()
watch(() => config.autocomplete.docs, () => {
  cachedContent.clear()
})

export async function getMarkdownDocs(name: string) {
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
