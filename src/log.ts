import type { MaybeRef } from 'reactive-vscode'
import { useLogger, watch } from 'reactive-vscode'
import { displayName } from './generated/meta'

const _logger = useLogger(displayName)

export const logger = {
  ..._logger,
  log(...args: any[]) {
    for (const arg of args) {
      _logger.info(JSON.stringify(arg, null, 2))
    }
  },
}

export function $inspect(...args: MaybeRef<any>[]) {
  watch(() => args, (values) => {
    for (const arg of values) {
      logger.log(JSON.stringify(arg, null, 2))
      // _logger.info(JSON.stringify(arg, null, 2))
    }
  })
}
