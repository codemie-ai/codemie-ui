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

import { WorkflowIssue } from '@/types/entity'

import WorkflowEditor, { type WorkflowEditorRef } from '../WorkflowEditor'

const SERIALIZED_YAML = 'serialized-from-editor'
const { mockUndo, mockDuplicateState, mockOnNodesChange, editorHookState, flowState, panelState } =
  vi.hoisted(() => ({
    panelState: { dirty: false, showDialog: vi.fn() },
    mockUndo: vi.fn(),
    mockOnNodesChange: vi.fn(),
    mockDuplicateState: vi.fn(),
    editorHookState: {
      selectedNode: undefined as { id: string } | undefined,
      nodes: [] as unknown[],
      config: { states: [] as unknown[], assistants: [] as unknown[] },
    },
    flowState: {
      nodes: [] as Array<{ id: string; data: { outline?: string | null } }>,
      onNodesChange: undefined as ((changes: unknown[]) => void) | undefined,
    },
  }))

vi.mock('@xyflow/react', () => ({
  ReactFlow: ({
    children,
    id,
    deleteKeyCode,
    nodes,
    onNodesChange,
  }: {
    children?: unknown
    id?: string
    deleteKeyCode?: unknown
    nodes?: Array<{ id: string; data: { outline?: string | null } }>
    onNodesChange?: (changes: unknown[]) => void
  }) => {
    flowState.nodes = nodes ?? []
    flowState.onNodesChange = onNodesChange
    return createElement(
      'div',
      {
        'data-testid': 'react-flow',
        'data-flow-id': id,
        'data-delete-key': JSON.stringify(deleteKeyCode ?? null),
      },
      children as never
    )
  },
  ReactFlowProvider: ({ children }: { children?: unknown }) => children,
}))

vi.mock('@/hooks/useReactFlowDnD', () => ({
  DnDProvider: ({ children }: { children?: unknown }) => children,
}))

vi.mock('@/hooks/useWorkflowEditor', () => ({
  default: () => ({
    nodes: editorHookState.nodes,
    edges: [],
    selectedNode: editorHookState.selectedNode,
    selectedEdge: undefined,
    onNodesChange: mockOnNodesChange,
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
    config: editorHookState.config,
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
        isDirty: () => panelState.dirty,
        showUnsavedChangesDialog: panelState.showDialog,
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
  mockOnNodesChange.mockClear()
  editorHookState.selectedNode = undefined
  editorHookState.nodes = []
  editorHookState.config = { states: [], assistants: [] }
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

  describe('with unsaved edits in the open panel', () => {
    afterEach(() => {
      panelState.dirty = false
      panelState.showDialog.mockClear()
    })

    const renderRef = () => {
      const editorRef = createRef<WorkflowEditorRef>()
      render(
        <WorkflowEditor
          yamlConfig="states: []"
          onConfigurationUpdate={vi.fn()}
          isFullscreen
          ref={editorRef}
        />
      )
      return editorRef
    }

    it('asks before the issues tab replaces a dirty panel', () => {
      const editorRef = renderRef()
      // A tab has to be open for the panel (and its dirty state) to exist.
      act(() => {
        editorRef.current?.openIssuesPanel()
      })
      act(() => {
        editorRef.current?.closeIssuesPanel()
      })
      expect(screen.queryByTestId('visible-tabs')).not.toBeInTheDocument()
      panelState.dirty = false

      act(() => {
        editorRef.current?.openIssuesPanel()
      })
      panelState.dirty = true
      act(() => {
        editorRef.current?.openIssuesPanel()
      })

      expect(panelState.showDialog).toHaveBeenCalledTimes(1)
    })

    describe('nodes changes', () => {
      const dimensions = { id: 'a', type: 'dimensions', dimensions: { width: 10, height: 10 } }

      const renderDirtyPanel = () => {
        const editorRef = renderRef()
        act(() => {
          editorRef.current?.openIssuesPanel()
        })
        panelState.dirty = true
        mockOnNodesChange.mockClear()
      }

      it('applies a ReactFlow measurement without opening Unsaved Changes', () => {
        renderDirtyPanel()

        act(() => {
          flowState.onNodesChange?.([dimensions])
        })

        expect(panelState.showDialog).not.toHaveBeenCalled()
        expect(mockOnNodesChange).toHaveBeenCalledWith([dimensions])
      })

      it.each([
        ['position', { id: 'a', type: 'position', position: { x: 1, y: 2 } }],
        ['select', { id: 'a', type: 'select', selected: true }],
      ])('still asks before a %s change replaces a dirty panel', (_, change) => {
        renderDirtyPanel()

        act(() => {
          flowState.onNodesChange?.([change])
        })

        expect(panelState.showDialog).toHaveBeenCalledTimes(1)
        expect(mockOnNodesChange).not.toHaveBeenCalled()
      })

      it('applies the measurement of a mixed batch and holds back only the user change', () => {
        renderDirtyPanel()
        const select = { id: 'a', type: 'select', selected: true }

        act(() => {
          flowState.onNodesChange?.([dimensions, select])
        })

        expect(mockOnNodesChange).toHaveBeenCalledTimes(1)
        expect(mockOnNodesChange).toHaveBeenCalledWith([dimensions])
        expect(panelState.showDialog).toHaveBeenCalledTimes(1)
      })

      it('applies every change straight away when the panel is clean', () => {
        const editorRef = renderRef()
        act(() => {
          editorRef.current?.openIssuesPanel()
        })
        const select = { id: 'a', type: 'select', selected: true }

        act(() => {
          flowState.onNodesChange?.([select])
        })

        expect(panelState.showDialog).not.toHaveBeenCalled()
        expect(mockOnNodesChange).toHaveBeenCalledWith([select])
      })
    })

    it('reports the open panel as dirty through isPanelDirty', () => {
      const editorRef = renderRef()
      act(() => {
        editorRef.current?.openIssuesPanel()
      })
      expect(editorRef.current?.isPanelDirty()).toBe(false)

      panelState.dirty = true
      expect(editorRef.current?.isPanelDirty()).toBe(true)
    })
  })
})

describe('WorkflowEditor node outlines', () => {
  const issue = (over: Record<string, unknown>) =>
    ({
      id: 'i1',
      message: 'm',
      path: 'config.contract.input',
      configLine: 1,
      stateId: 'n1',
      outcome: 'WARNING',
      error_type: 'contract_validation',
      ...over,
    } as unknown as WorkflowIssue)

  const renderWithIssues = (issues: WorkflowIssue[]) => {
    // Unchanged states, so revalidation leaves the issues unresolved.
    const state = (id: string) => ({ id, assistant_id: 'a', _meta: { type: 'assistant' } })
    editorHookState.config = { states: [state('n1'), state('n2')], assistants: [{ id: 'a' }] }
    editorHookState.nodes = [
      { id: 'n1', type: 'assistant', position: { x: 0, y: 0 }, data: {} },
      { id: 'n2', type: 'assistant', position: { x: 0, y: 0 }, data: {} },
    ]
    render(
      <WorkflowEditor
        yamlConfig="states: []"
        onConfigurationUpdate={vi.fn()}
        isFullscreen
        issues={issues}
      />
    )
    return Object.fromEntries(flowState.nodes.map((n) => [n.id, n.data.outline]))
  }

  it('outlines a node amber for a contract warning even when the path has no control', () => {
    expect(renderWithIssues([issue({ path: 'not.a.registered.path' })])).toEqual({
      n1: 'warning',
      n2: null,
    })
  })

  it('does not outline a node for an UNVERIFIED issue', () => {
    expect(renderWithIssues([issue({ outcome: 'UNVERIFIED' })])).toEqual({ n1: null, n2: null })
  })

  it('lets an error outrank a warning on the same node', () => {
    expect(renderWithIssues([issue({ id: 'w' }), issue({ id: 'e', outcome: 'ERROR' })]).n1).toBe(
      'error'
    )
  })

  it('keeps filtering non-contract issues for unsupported paths', () => {
    expect(
      renderWithIssues([
        issue({ error_type: 'other', outcome: 'ERROR', path: 'not.a.registered.path' }),
      ]).n1
    ).toBeNull()
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
