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

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRef, createElement, forwardRef, useImperativeHandle } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import WorkflowEditor, { type WorkflowEditorRef } from '../WorkflowEditor'

const SERIALIZED_YAML = 'serialized-from-editor'
const { mockUndo, mockDuplicateState, editorHookState } = vi.hoisted(() => ({
  mockUndo: vi.fn(),
  mockDuplicateState: vi.fn(),
  editorHookState: { selectedNode: undefined as { id: string } | undefined },
}))

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    children,
    id,
    deleteKeyCode,
  }: {
    children?: unknown
    id?: string
    deleteKeyCode?: unknown
  }) =>
    createElement(
      'div',
      {
        'data-testid': 'react-flow',
        'data-flow-id': id,
        'data-delete-key': JSON.stringify(deleteKeyCode ?? null),
      },
      children as never
    ),
  ReactFlowProvider: ({ children }: { children?: unknown }) => children,
}))

vi.mock('@/hooks/useReactFlowDnD', () => ({
  DnDProvider: ({ children }: { children?: unknown }) => children,
}))

vi.mock('@/hooks/useWorkflowEditor', () => ({
  default: () => ({
    nodes: [],
    edges: [],
    selectedNode: editorHookState.selectedNode,
    selectedEdge: undefined,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onNodeDrag: vi.fn(),
    onNodeDragStop: vi.fn(),
    onSelectionChange: vi.fn(),
    onSelectionReset: vi.fn(),
    onConnect: vi.fn(),
    onBeforeDelete: vi.fn(),
    createState: vi.fn(),
    fitView: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    getNodes: () => [],
    getConfig: vi.fn(),
    findState: vi.fn(),
    updateConfig: vi.fn(),
    updateAdvancedConfig: vi.fn(),
    removeState: vi.fn(),
    duplicateState: mockDuplicateState,
    deleteNode: vi.fn(),
    deleteConnection: vi.fn(),
    selectNode: vi.fn(),
    config: { states: [] },
    onBeautify: vi.fn(),
    canUndo: true,
    undo: mockUndo,
  }),
}))

vi.mock('@/utils/workflowEditor/serialization', () => ({
  serialize: () => SERIALIZED_YAML,
}))

vi.mock('../ConfigPanel', () => ({
  default: forwardRef(
    (
      {
        onShowVersionHistory,
        visibleTabs,
      }: {
        onShowVersionHistory?: (yaml: string) => void
        visibleTabs?: string[]
      },
      ref
    ) => {
      useImperativeHandle(ref, () => ({
        triggerGeneralConfigValidation: async () => undefined,
        isDirty: () => false,
        showUnsavedChangesDialog: vi.fn(),
        save: async () => true,
        getWorkflowFields: () => null,
      }))
      if (!visibleTabs?.length) return null
      return createElement(
        'div',
        { 'data-testid': 'config-panel' },
        createElement('span', { 'data-testid': 'visible-tabs' }, visibleTabs.join(',')),
        createElement(
          'button',
          {
            type: 'button',
            onClick: () => onShowVersionHistory?.('yaml-panel-visible-yaml'),
          },
          'YAML History'
        )
      )
    }
  ),
}))

vi.mock('../Sidebar', () => ({ default: () => null }))
vi.mock('../EditorBackground', () => ({ default: () => null }))
vi.mock('../EditorControls', () => ({ default: () => null }))
vi.mock('../nodes', () => ({ nodeTypeComponents: {} }))
vi.mock('../edges/BackwardsEdge', () => ({ default: () => null }))
vi.mock('@/utils/workflowEditor/helpers/export/downloadWorkflowImage', () => ({
  downloadWorkflowImage: vi.fn(),
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (store: unknown) => store,
  }
})

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { configs: [] },
}))

vi.mock('@/utils/settings', () => ({
  isConfigItemEnabled: () => false,
  getConfigItemSettings: () => null,
}))

const renderEditor = (
  props: {
    disableCanvasShortcuts?: boolean
    onShowVersionHistory?: (yaml: string) => void
    onShowVisualVersionHistory?: (yaml: string) => void
  } = {}
) =>
  render(
    <WorkflowEditor
      yamlConfig="states: []"
      onConfigurationUpdate={vi.fn()}
      isFullscreen
      {...props}
    />
  )

afterEach(() => {
  cleanup()
  mockUndo.mockClear()
  mockDuplicateState.mockClear()
  editorHookState.selectedNode = undefined
})

describe('WorkflowEditor canvas shortcuts', () => {
  it('does not call undo on Cmd+Z when disableCanvasShortcuts is true', () => {
    mockUndo.mockClear()
    renderEditor({ disableCanvasShortcuts: true })

    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    expect(mockUndo).not.toHaveBeenCalled()
  })

  it('does not call undo on Ctrl+Z when disableCanvasShortcuts is true', () => {
    mockUndo.mockClear()
    renderEditor({ disableCanvasShortcuts: true })

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })

    expect(mockUndo).not.toHaveBeenCalled()
  })

  it('calls undo on Cmd+Z when disableCanvasShortcuts is false', () => {
    mockUndo.mockClear()
    renderEditor()

    fireEvent.keyDown(window, { key: 'z', metaKey: true })

    expect(mockUndo).toHaveBeenCalled()
  })

  it('does not duplicate on Cmd+D when disableCanvasShortcuts is true', () => {
    editorHookState.selectedNode = { id: 'n1' }
    renderEditor({ disableCanvasShortcuts: true })

    fireEvent.keyDown(window, { key: 'd', metaKey: true })

    expect(mockDuplicateState).not.toHaveBeenCalled()
  })

  it('does not duplicate on Ctrl+D when disableCanvasShortcuts is true', () => {
    editorHookState.selectedNode = { id: 'n1' }
    renderEditor({ disableCanvasShortcuts: true })

    fireEvent.keyDown(window, { key: 'd', ctrlKey: true })

    expect(mockDuplicateState).not.toHaveBeenCalled()
  })

  it('duplicates on Cmd+D when disableCanvasShortcuts is false', () => {
    editorHookState.selectedNode = { id: 'n1' }
    renderEditor()

    fireEvent.keyDown(window, { key: 'd', metaKey: true })

    expect(mockDuplicateState).toHaveBeenCalledWith('n1')
  })

  it('disables ReactFlow delete keys when disableCanvasShortcuts is true', () => {
    renderEditor({ disableCanvasShortcuts: true })

    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-delete-key', 'null')
  })

  it('keeps ReactFlow delete keys when disableCanvasShortcuts is false', () => {
    renderEditor()

    expect(screen.getByTestId('react-flow')).toHaveAttribute(
      'data-delete-key',
      JSON.stringify(['Backspace', 'Delete'])
    )
  })

  it('gives the editor canvas a unique ReactFlow id', () => {
    renderEditor()

    expect(screen.getByTestId('react-flow')).toHaveAttribute('data-flow-id', 'workflow-editor')
  })
})

describe('WorkflowEditor issues panel', () => {
  it('closeIssuesPanel removes the issues tab from the panel', () => {
    const editorRef = createRef<WorkflowEditorRef>()
    render(
      <WorkflowEditor
        yamlConfig="states: []"
        onConfigurationUpdate={vi.fn()}
        isFullscreen
        ref={editorRef}
      />
    )

    act(() => {
      editorRef.current?.openIssuesPanel()
    })
    expect(screen.getByTestId('visible-tabs').textContent).toContain('issues')

    act(() => {
      editorRef.current?.closeIssuesPanel()
    })
    expect(screen.queryByTestId('visible-tabs')).not.toBeInTheDocument()
  })
})

describe('WorkflowEditor version history YAML source', () => {
  it('uses serialized YAML for visual history and the Ace buffer for YAML history', () => {
    const onShowVersionHistory = vi.fn()
    const onShowVisualVersionHistory = vi.fn()
    renderEditor({ onShowVersionHistory, onShowVisualVersionHistory })

    fireEvent.click(screen.getByRole('button', { name: 'Version History (visual editor)' }))
    fireEvent.click(screen.getByRole('button', { name: 'YAML' }))
    fireEvent.click(screen.getByRole('button', { name: 'YAML History' }))

    expect(onShowVisualVersionHistory).toHaveBeenCalledWith(SERIALIZED_YAML)
    expect(onShowVersionHistory).toHaveBeenCalledWith('yaml-panel-visible-yaml')
  })
})
