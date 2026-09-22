// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { createContext, useContext } from 'react'

import { getTailwindColor } from '@/utils/tailwindColors'
import type { DiffStatus } from '@/utils/workflowEditor/diffWorkflowGraphs'

export const DIFF_BORDER_CLASS: Record<DiffStatus, string> = {
  added: '!border-success-primary',
  removed: '!border-failed-secondary',
  modified: '!border-aborted-primary',
}

export const DIFF_BG_CLASS: Record<DiffStatus, string> = {
  added: 'bg-success-primary',
  removed: 'bg-failed-secondary',
  modified: 'bg-aborted-primary',
}

export const DIFF_CSS_VAR: Record<DiffStatus, string> = {
  added: '--colors-success-primary',
  removed: '--colors-failed-secondary',
  modified: '--colors-aborted-primary',
}

export const DIFF_ITERATOR_SVG_CLASS: Record<DiffStatus, string> = {
  added: 'text-success-primary stroke-success-primary',
  removed: 'text-failed-secondary stroke-failed-secondary',
  modified: 'text-aborted-primary stroke-aborted-primary',
}

export const DIFF_BADGE_LABEL: Record<DiffStatus, string> = {
  added: 'ADDED',
  removed: 'REMOVED',
  modified: 'MODIFIED',
}

export function getDiffColor(status: DiffStatus): string {
  return getTailwindColor(DIFF_CSS_VAR[status], getTailwindColor('--colors-border-primary', 'gray'))
}

export const NODE_RENDER_MODE = {
  EDITOR: 'editor',
  VISUAL_DIFF: 'visual-diff',
} as const

export type NodeRenderMode = (typeof NODE_RENDER_MODE)[keyof typeof NODE_RENDER_MODE]

export interface NodeRenderState {
  mode: NodeRenderMode
  diffStatus?: DiffStatus
}

const DEFAULT_NODE_RENDER_STATE: NodeRenderState = {
  mode: NODE_RENDER_MODE.EDITOR,
}

/** Rendering state shared by nodes without adding presentation fields to React Flow node data. */
export const NodeRenderContext = createContext<NodeRenderState>(DEFAULT_NODE_RENDER_STATE)

export const useNodeRenderState = (): NodeRenderState => useContext(NodeRenderContext)
