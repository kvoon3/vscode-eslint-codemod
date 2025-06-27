import type { TextDocument } from 'vscode'
import { useLogger } from 'reactive-vscode'
import { workspace } from 'vscode'
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

export function getCurWorkspaceDir(document: TextDocument) {
  const workspaceFolder = workspace.getWorkspaceFolder(document.uri)
  return workspaceFolder ? workspaceFolder.uri.fsPath : undefined
}
