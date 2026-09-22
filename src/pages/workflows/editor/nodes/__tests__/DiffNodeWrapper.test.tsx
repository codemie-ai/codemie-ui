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

import { cleanup, render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NoteStateConfiguration, StateConfiguration } from '@/types/workflowEditor/configuration'

import BaseNode from '../BaseNode'
import {
  DIFF_BORDER_CLASS,
  DIFF_ITERATOR_SVG_CLASS,
  NODE_RENDER_MODE,
  NodeRenderContext,
} from '../diffChromeContext'
import DiffLegend from '../DiffLegend'
import { DiffNodeWrapper } from '../DiffNodeWrapper'
import { IteratorNode } from '../IteratorNode'
import { NoteNode } from '../NoteNode'

import type { NodeProps } from '@xyflow/react'
import type { ComponentType, ReactNode } from 'react'

// BaseNode → execution controls → MarkdownEditor → react-syntax-highlighter,
// which crashes under this environment's ESM/CJS setup.
vi.mock('react-syntax-highlighter', () => ({
  Prism: () => null,
}))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dracula: {},
  prism: {},
}))

vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: (_property: string, fallback?: string) => fallback ?? '#111',
}))

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...actual,
    useUpdateNodeInternals: () => vi.fn(),
    NodeResizeControl: ({ children }: { children?: ReactNode }) => (
      <div data-testid="resize-control">{children}</div>
    ),
  }
})

vi.mock('@/assets/images/node-iterator-border.svg?react', () => ({
  default: (props: Record<string, unknown>) => <svg data-testid="iterator-border" {...props} />,
}))

vi.mock('@/assets/icons/refresh.svg?react', () => ({
  default: () => <svg data-testid="refresh-icon" />,
}))

vi.mock('@/assets/icons/expand.svg?react', () => ({
  default: () => <svg data-testid="expand-icon" />,
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({
  default: () => <span data-testid="delete-icon" />,
}))

const Original = () => <div data-testid="original-node">node</div>

const renderWrapper = (diffStatus: 'added' | 'removed' | 'modified') =>
  render(
    <DiffNodeWrapper
      {...({
        id: 'n1',
        type: 'assistant',
        selected: false,
        dragging: false,
        zIndex: 0,
        isConnectable: false,
        positionAbsoluteX: 0,
        positionAbsoluteY: 0,
        data: { diffStatus, OriginalComponent: Original },
      } as NodeProps & {
        data: { diffStatus: typeof diffStatus; OriginalComponent: typeof Original }
      })}
    />
  )

const BaseNodeOriginal = () => (
  <BaseNode>
    <span>content</span>
  </BaseNode>
)

const mockFindState = vi.fn()
const mockGetConfig = vi.fn()
const mockUpdateConfig = vi.fn()
const mockRemoveState = vi.fn()
const mockOnNodesChange = vi.fn()

const nodeCallbacks = {
  findState: mockFindState,
  getConfig: mockGetConfig,
  updateConfig: mockUpdateConfig,
  removeState: mockRemoveState,
}

const iteratorState: StateConfiguration = {
  id: 'iterator1',
  _meta: {
    type: 'iterator',
    is_connected: true,
    data: { next: { iter_key: 'items' } },
  },
}

const noteState: NoteStateConfiguration = {
  id: 'note1',
  note: 'diff note',
  _meta: {
    type: 'note',
    is_connected: false,
    data: { note: 'diff note' },
  },
}

const renderWrappedOriginal = (
  OriginalComponent: ComponentType<NodeProps>,
  diffStatus: 'added' | 'removed' | 'modified',
  extraData: Record<string, unknown> = {},
  extras: { id?: string; type?: string } = {}
) =>
  render(
    <ReactFlowProvider>
      <DiffNodeWrapper
        {...({
          id: extras.id ?? 'n1',
          type: extras.type ?? 'assistant',
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          data: { diffStatus, OriginalComponent, ...extraData },
        } as NodeProps & {
          data: {
            diffStatus: typeof diffStatus
            OriginalComponent: typeof OriginalComponent
          }
        })}
      />
    </ReactFlowProvider>
  )

afterEach(cleanup)

describe('DiffNodeWrapper', () => {
  it('renders the diff badge and original node inside diff chrome root', () => {
    const { container } = renderWrapper('modified')

    expect(screen.getByText('MODIFIED')).toBeInTheDocument()
    expect(screen.getByTestId('original-node')).toBeInTheDocument()
    expect(container.querySelector('[data-testid="diff-chrome-root"]')).toBeInTheDocument()
  })

  it('applies strikethrough to removed nodes', () => {
    const { container } = renderWrapper('removed')

    const root = container.querySelector('[data-testid="diff-chrome-root"]')
    expect(root).toBeInTheDocument()
    const body = root?.querySelector(':scope > div')
    expect(body).toHaveClass('[&_.workflow-base-node_*]:line-through')
  })

  it('provides diff status context for added nodes', () => {
    renderWrapper('added')
    expect(screen.getByText('ADDED')).toBeInTheDocument()
  })

  it('wraps OriginalComponent in pointer-events-none to block note/delete interaction', () => {
    const { container } = renderWrapper('added')
    const root = container.querySelector('[data-testid="diff-chrome-root"]')
    const body = root?.querySelector(':scope > div')
    expect(body).toHaveClass('pointer-events-none')
  })

  it('wraps unchanged nodes in pointer-events-none', () => {
    const { container } = render(
      <DiffNodeWrapper
        {...({
          id: 'n1',
          type: 'assistant',
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          data: { OriginalComponent: Original },
        } as NodeProps & { data: { OriginalComponent: typeof Original } })}
      />
    )

    const inert = container.querySelector('.pointer-events-none')
    expect(inert).toBeInTheDocument()
    expect(inert).toContainElement(screen.getByTestId('original-node'))
  })
})

describe('BaseNode diff chrome via NodeRenderContext', () => {
  it('applies success border color at the same width when context value is "added"', () => {
    const { container } = render(
      <NodeRenderContext.Provider
        value={{ mode: NODE_RENDER_MODE.VISUAL_DIFF, diffStatus: 'added' }}
      >
        <BaseNode>
          <span>content</span>
        </BaseNode>
      </NodeRenderContext.Provider>
    )

    const baseNode = container.querySelector('.workflow-base-node')
    expect(baseNode).toHaveClass('border-[1.5px]')
    expect(baseNode).toHaveClass('!border-success-primary')
  })

  it('applies error border color at the same width when context value is "removed"', () => {
    const { container } = render(
      <NodeRenderContext.Provider
        value={{ mode: NODE_RENDER_MODE.VISUAL_DIFF, diffStatus: 'removed' }}
      >
        <BaseNode>
          <span>content</span>
        </BaseNode>
      </NodeRenderContext.Provider>
    )

    const baseNode = container.querySelector('.workflow-base-node')
    expect(baseNode).toHaveClass('border-[1.5px]')
    expect(baseNode).toHaveClass('!border-failed-secondary')
  })

  it('uses default border when no diff context is provided', () => {
    const { container } = render(
      <BaseNode>
        <span>content</span>
      </BaseNode>
    )

    const baseNode = container.querySelector('.workflow-base-node')
    expect(baseNode).not.toHaveClass('!border-success-primary')
    expect(baseNode).toHaveClass('border-[1.5px]')
  })

  it('hides the connection indicator in visual diff mode', () => {
    const { container } = render(
      <NodeRenderContext.Provider value={{ mode: NODE_RENDER_MODE.VISUAL_DIFF }}>
        <BaseNode isConnected>
          <span>content</span>
        </BaseNode>
      </NodeRenderContext.Provider>
    )

    expect(container.querySelector('.connection-ind')).not.toBeInTheDocument()
  })

  it('shows the connection indicator in the editor', () => {
    const { container } = render(
      <BaseNode isConnected>
        <span>content</span>
      </BaseNode>
    )

    expect(container.querySelector('.connection-ind')).toBeInTheDocument()
  })

  it('does not re-enable pointer events on iterators in visual diff mode', () => {
    const { container } = render(
      <NodeRenderContext.Provider value={{ mode: NODE_RENDER_MODE.VISUAL_DIFF }}>
        <BaseNode success={1} failures={0}>
          <span>content</span>
        </BaseNode>
      </NodeRenderContext.Provider>
    )

    expect(container.querySelector('.workflow-base-node')).not.toHaveClass('!pointer-events-auto')
  })

  it('re-enables pointer events on iterators in the editor', () => {
    const { container } = render(
      <BaseNode success={1} failures={0}>
        <span>content</span>
      </BaseNode>
    )

    expect(container.querySelector('.workflow-base-node')).toHaveClass('!pointer-events-auto')
  })
})

describe('DiffNodeWrapper connection indicator', () => {
  const OriginalWithIndicator = () => (
    <BaseNode isConnected>
      <span>content</span>
    </BaseNode>
  )

  it('hides the connection indicator on unchanged nodes', () => {
    const { container } = render(
      <DiffNodeWrapper
        {...({
          id: 'n1',
          type: 'assistant',
          selected: false,
          dragging: false,
          zIndex: 0,
          isConnectable: false,
          positionAbsoluteX: 0,
          positionAbsoluteY: 0,
          data: { OriginalComponent: OriginalWithIndicator },
        } as NodeProps & { data: { OriginalComponent: typeof OriginalWithIndicator } })}
      />
    )

    expect(container.querySelector('.connection-ind')).not.toBeInTheDocument()
  })
})

describe('DiffNodeWrapper tint path', () => {
  it('applies DIFF_BORDER_CLASS.added on BaseNode when wrapped', () => {
    const { container } = renderWrappedOriginal(BaseNodeOriginal, 'added')

    const baseNode = container.querySelector('.workflow-base-node')
    expect(baseNode).toHaveClass(DIFF_BORDER_CLASS.added)
  })

  it('applies DIFF_BORDER_CLASS.removed on BaseNode when wrapped', () => {
    const { container } = renderWrappedOriginal(BaseNodeOriginal, 'removed')

    const baseNode = container.querySelector('.workflow-base-node')
    expect(baseNode).toHaveClass(DIFF_BORDER_CLASS.removed)
  })

  it('applies DIFF_BORDER_CLASS.modified on BaseNode when wrapped', () => {
    const { container } = renderWrappedOriginal(BaseNodeOriginal, 'modified')

    const baseNode = container.querySelector('.workflow-base-node')
    expect(baseNode).toHaveClass(DIFF_BORDER_CLASS.modified)
  })

  it('applies DIFF_ITERATOR_SVG_CLASS.added on IteratorNode when wrapped', () => {
    mockFindState.mockReturnValue(iteratorState)

    renderWrappedOriginal(IteratorNode as ComponentType<NodeProps>, 'added', nodeCallbacks, {
      id: 'iterator1',
      type: 'iterator',
    })

    expect(screen.getByTestId('iterator-border')).toHaveClass(DIFF_ITERATOR_SVG_CLASS.added)
  })

  it('applies DIFF_BORDER_CLASS.removed on NoteNode when wrapped', () => {
    mockFindState.mockReturnValue(noteState)

    const { container } = renderWrappedOriginal(
      NoteNode as ComponentType<NodeProps>,
      'removed',
      { ...nodeCallbacks, onNodesChange: mockOnNodesChange },
      { id: 'note1', type: 'note' }
    )

    const noteNode = container.querySelector('.bg-surface-specific-node-note-bg')
    expect(noteNode).toHaveClass(DIFF_BORDER_CLASS.removed)
  })
})

describe('DiffLegend', () => {
  it('renders Added, Modified, and Removed labels', () => {
    render(<DiffLegend />)

    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.getByText('Modified')).toBeInTheDocument()
    expect(screen.getByText('Removed')).toBeInTheDocument()
  })
})
