import type { TextDocument, TextEditor } from 'vscode'
import { useActiveTextEditor, useTextEditorSelection } from 'reactive-vscode'
import { Position, Range, workspace } from 'vscode'

export function getCurWorkspaceDir(document: TextDocument) {
  const workspaceFolder = workspace.getWorkspaceFolder(document.uri)
  return workspaceFolder ? workspaceFolder.uri.fsPath : undefined
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

export const reject = (message: string) => Promise.reject(new Error(message))
