import type { NestedScopedConfigs } from './generated/meta'
import { defineConfigObject, useEvent } from 'reactive-vscode'
import { scopedConfigs } from './generated/meta'

export const config = defineConfigObject<NestedScopedConfigs>(
  scopedConfigs.scope,
  scopedConfigs.defaults,
)
