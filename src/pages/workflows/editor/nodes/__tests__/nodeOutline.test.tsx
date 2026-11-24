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

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import BaseNode from '../BaseNode'
import { getNodeOutlineClass, HIGHLIGHT_OUTLINE_CLASS, NODE_OUTLINE_CLASS } from '../common'
import { NODE_RENDER_MODE, NodeRenderContext } from '../diffChromeContext'

// BaseNode → execution controls → MarkdownEditor → react-syntax-highlighter,
// which crashes under this environment's ESM/CJS setup.
vi.mock('react-syntax-highlighter', () => ({
  Prism: () => null,
}))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dracula: {},
  prism: {},
}))

const RED = 'outline-failed-secondary'
const AMBER = 'outline-aborted-secondary'
const HIGHLIGHT = 'outline-border-accent'

describe('getNodeOutlineClass', () => {
  it('maps an error outline to the red class and a warning outline to the amber class', () => {
    expect(getNodeOutlineClass('error', false)).toBe(NODE_OUTLINE_CLASS.error)
    expect(getNodeOutlineClass('warning', false)).toBe(NODE_OUTLINE_CLASS.warning)
    expect(NODE_OUTLINE_CLASS.error).toContain(RED)
    expect(NODE_OUTLINE_CLASS.warning).toContain(AMBER)
  })

  it('uses the highlight class only when there is no issue outline', () => {
    expect(getNodeOutlineClass(null, true)).toBe(HIGHLIGHT_OUTLINE_CLASS)
    expect(getNodeOutlineClass('warning', true)).toBe(NODE_OUTLINE_CLASS.warning)
    expect(getNodeOutlineClass('error', true)).not.toContain(HIGHLIGHT)
  })

  it('adds no outline for an unflagged, unhighlighted node', () => {
    expect(getNodeOutlineClass(null, false)).toBe('')
    expect(getNodeOutlineClass(undefined, false)).toBe('')
  })
})

describe('BaseNode outline', () => {
  const renderNode = (props: Record<string, unknown>, diffStatus?: 'added') =>
    render(
      <NodeRenderContext.Provider value={{ mode: NODE_RENDER_MODE.EDITOR, diffStatus }}>
        <BaseNode {...props}>
          <span>content</span>
        </BaseNode>
      </NodeRenderContext.Provider>
    ).container.firstElementChild as HTMLElement

  it('renders the amber outline for a warning node', () => {
    const node = renderNode({ outline: 'warning' })
    expect(node.className).toContain(AMBER)
    expect(node.className).not.toContain(RED)
  })

  it('renders the red outline for an error node', () => {
    const node = renderNode({ outline: 'error' })
    expect(node.className).toContain(RED)
    expect(node.className).not.toContain(AMBER)
  })

  it('renders the highlight outline only when no issue outline applies', () => {
    expect(renderNode({ outline: null, highlighted: true }).className).toContain(HIGHLIGHT)
    expect(renderNode({ outline: 'warning', highlighted: true }).className).not.toContain(HIGHLIGHT)
  })

  it('renders no outline under diff chrome', () => {
    const node = renderNode({ outline: 'error', highlighted: true }, 'added')
    expect(node.className).not.toContain(RED)
    expect(node.className).not.toContain(HIGHLIGHT)
  })
})
