import { ESLint } from 'eslint'
import { shallowRef } from 'reactive-vscode'
import { logger } from './utils'

// export const linter = shallowRef<Linter | undefined>(undefined)
export const eslint = shallowRef<ESLint | undefined>()
export const lintConfig = shallowRef<any>(undefined)

export async function resolveLintConfig(cwd: string) {
  const eslint = new ESLint({ cwd, fix: false })
  const configPath = await eslint.findConfigFile()

  // linter.value = new Linter({ cwd })

  logger.info('configPath', configPath)

  if (configPath) {
    const config = lintConfig.value = await import(configPath).then(i => i.default).catch((error) => {
      logger.error('error', error)
    })

    // // TODO: remove
    // const c = config.find((i: any) => i.name.includes('command'))
    // logger.log('c',c)
    return config
  }
  else {
    return Promise.reject(new Error('Cannot find config file'))
  }
}
