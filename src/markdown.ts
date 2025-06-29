import { ofetch } from 'ofetch'
import { watch } from 'reactive-vscode'
import { config } from './config'

const cachedContent = new Map<string, string>()
watch(() => config.autocomplete.docs, () => {
  cachedContent.clear()
})

export async function getMarkdownDocs(name: string): Promise<string> {
  const get = async () => {
    const content = await ofetch(`https://raw.githubusercontent.com/antfu/eslint-plugin-command/refs/heads/main/src/commands/${name}.md`)
    // TODO: remove H1 header
    // .then((content) => {
    //   return content.replace(/#\s.*\n?/, '').trim()
    // })
    cachedContent.set(name, content)
    return content
  }

  if (cachedContent.has(name))
    return cachedContent.get(name) || get()

  return get()
}
