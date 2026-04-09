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

import { NodeChange, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import isEqual from 'lodash/isEqual'
import React, {
  Dispatch,
  forwardRef,
  SetStateAction,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useEscapeKey } from '@/hooks/useEscapeKey'
import { DnDProvider } from '@/hooks/useReactFlowDnD'
import { useTheme } from '@/hooks/useTheme'
import useWorkflowEditor from '@/hooks/useWorkflowEditor'
import { WorkflowFormValues } from '@/pages/workflows/components/workflowSchema'
import { WorkflowIssue, isWorkflowAssistantToolIssue } from '@/types/entity'
import { NodeType, WorkflowEdge, WorkflowNode } from '@/types/workflowEditor/base'
import { cn } from '@/utils/utils'
import { downloadWorkflowImage } from '@/utils/workflowEditor/helpers/export/downloadWorkflowImage'
import { isNoteNode, isStartOrEndNode } from '@/utils/workflowEditor/helpers/nodes/nodeTypeCheckers'
import { serialize } from '@/utils/workflowEditor/serialization'

import ConfigPanel, { ConfigPanelRef } from './ConfigPanel'
import { PanelTabId, TAB_DATA } from './constants'
import BackwardsEdge from './edges/BackwardsEdge'
import EditorActions from './EditorActions'
import EditorBackground from './EditorBackground'
import EditorControls from './EditorControls'
import { WorkflowContext } from './hooks/useWorkflowContext'
import useWorkflowFieldIssues from './hooks/useWorkflowFieldIssues'
import useWorkflowIssues from './hooks/useWorkflowIssues'
import { nodeTypeComponents } from './nodes'
import Sidebar from './Sidebar'
import { isFieldSupported } from './utils/visualEditorFieldRegistry'

const edgeTypeComponents = {
  backwards: BackwardsEdge,
}

const createUndoShortcut = (onUndo: () => void, canUndo: boolean, isDisabled: boolean) => {
  return (event: KeyboardEvent) => {
    const isUndo = (event.metaKey || event.ctrlKey) && event.key === 'z'

    if (isUndo && canUndo && !isDisabled) {
      event.preventDefault()
      onUndo()
    }
  }
}

const createDuplicateShortcut = (onDuplicate: () => void, isDisabled: boolean) => {
  return (event: KeyboardEvent) => {
    const isDuplicate = (event.metaKey || event.ctrlKey) && event.key === 'd'

    if (isDuplicate && !isDisabled) {
      event.preventDefault()
      onDuplicate()
    }
  }
}

interface WorkflowEditorProps {
  workflow?: any
  yamlConfig: string
  onConfigurationUpdate: (config) => void
  onWorkflowUpdate?: (values: any) => void
  isFullscreen: boolean
  onLoadExample?: () => void
  issues?: WorkflowIssue[] | null
  setIssues?: Dispatch<SetStateAction<WorkflowIssue[] | null>>
}

enum ColorMode {
  Light = 'light',
  Dark = 'dark',
}

const DEFAULT_EDGE_OPTS = {
  animated: true,
  type: 'default',
  pathOptions: { curvature: 0.5 },
}

const VIEWPORT = {
  FULLSCREEN: { padding: { left: 0.8, right: 0.1 }, maxZoom: 0.8 },
  WINDOWED: { padding: 0.1 },
  DEFAULT: { x: 0, y: 0, zoom: 1 },
}

const ZOOM = {
  FULLSCREEN: {
    MIN: 0.2,
    MAX: 1.2,
  },
  WINDOWED: {
    MIN: 0.1,
    MAX: 1.2,
  },
}

export interface WorkflowEditorRef {
  showWorkflowConfig: () => void
  triggerGeneralConfigValidation: () => Promise<void>
  saveCurrentTab: () => Promise<boolean>
  getYamlConfig: () => string
  getWorkflowFields: () => WorkflowFormValues | null
  openIssuesPanel: () => void
  clearAllResolvedFields: () => void
}

const WorkflowEditor = forwardRef<WorkflowEditorRef, WorkflowEditorProps>(
  (
    {
      workflow,
      yamlConfig,
      onConfigurationUpdate,
      onWorkflowUpdate,
      isFullscreen = false,
      onLoadExample,
      issues,
      setIssues,
    },
    ref
  ) => {
    const { isDark } = useTheme()
    const [locked, setLocked] = useState(false)
    const [configPanelCollapsed, setConfigPanelCollapsed] = useState(false)
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
    const configPanelRef = useRef<ConfigPanelRef>(null)

    const [tabs, setTabs] = useState<PanelTabId[]>([])
    const [activeTab, setActiveTab] = useState<PanelTabId | null>(null)
    const isYamlTabVisible = tabs.includes(TAB_DATA.YAML.ID)
    const isConfigTabVisible = tabs.includes(TAB_DATA.CONFIGURATION.ID)

    const closeTabs = useCallback(() => {
      setTabs([])
      setActiveTab(null)
    }, [])

    const prevSelectionRef = useRef<{ nodeId?: string; edgeId?: string }>({})
    const handleSelectionChange = useCallback(
      ({ node, edge }: { node?: WorkflowNode; edge?: WorkflowEdge }) => {
        const currentNodeId = node?.id
        const currentEdgeId = edge?.id

        const selectionChanged =
          prevSelectionRef.current.nodeId !== currentNodeId ||
          prevSelectionRef.current.edgeId !== currentEdgeId

        prevSelectionRef.current = { nodeId: currentNodeId, edgeId: currentEdgeId }
        if (!selectionChanged) return

        if (node && (isStartOrEndNode(node) || isNoteNode(node))) {
          closeTabs()
          return
        }

        if (node) {
          setTabs([TAB_DATA.NODE.ID])
          setActiveTab(TAB_DATA.NODE.ID)
        } else if (edge) {
          setTabs([TAB_DATA.EDGE.ID])
          setActiveTab(TAB_DATA.EDGE.ID)
        }
      },
      [closeTabs]
    )

    const editor = useWorkflowEditor(yamlConfig, onConfigurationUpdate, { handleSelectionChange })

    const [isExpanded, setIsExpanded] = useState(false)
    const handleToggleExpand = useCallback(() => {
      setIsExpanded((prev) => !prev)
    }, [])
    useEscapeKey(handleToggleExpand, isExpanded)
    useEffect(() => {
      if (isExpanded) {
        editor.fitView(VIEWPORT.WINDOWED)
      }
    }, [isExpanded])

    const handleLoadExample = () => {
      if (onLoadExample) {
        executeWithUnsavedCheck(() => {
          onLoadExample()
          setTimeout(() => {
            adjustViewport(isFullscreen)
          }, 50)
        })
      }
    }

    const handleCloseConfigPanel = (forceClose = false) => {
      if (!forceClose && configPanelRef.current?.isDirty()) {
        configPanelRef.current?.showUnsavedChangesDialog()
        return
      }

      if (editor.selectedNode || editor.selectedEdge) {
        editor.onSelectionReset()
      }

      closeTabs()
    }

    const handleToggleLock = () => {
      setLocked(!locked)
    }

    const executeWithUnsavedCheck = useCallback((action: () => void) => {
      if (configPanelRef.current?.isDirty()) {
        setPendingAction(() => action)
        configPanelRef.current?.showUnsavedChangesDialog()
        return false
      }
      action()
      return true
    }, [])

    const handleUndo = () => {
      executeWithUnsavedCheck(() => editor.undo())
    }

    const handleBeautify = () => {
      executeWithUnsavedCheck(() => {
        editor.onBeautify()
        setTimeout(() => adjustViewport(isFullscreen), 10)
      })
    }

    const handleDownloadImage = () => {
      downloadWorkflowImage({
        nodes: editor.getNodes(),
        workflowName: workflow?.name,
        isDark,
      })
    }

    const openWorkflowConfig = () => {
      executeWithUnsavedCheck(() => {
        editor.onSelectionReset()
        setTabs([TAB_DATA.CONFIGURATION.ID])
        setActiveTab(TAB_DATA.CONFIGURATION.ID)
      })
    }

    const handleCreateState = (type: NodeType, position: { x: number; y: number }) => {
      executeWithUnsavedCheck(() => editor.createState(type, position))
    }

    useImperativeHandle(ref, () => ({
      showWorkflowConfig: openWorkflowConfig,
      triggerGeneralConfigValidation: async () => {
        await configPanelRef.current?.triggerGeneralConfigValidation()
      },
      saveCurrentTab: async () => (await configPanelRef.current?.save()) ?? true,
      getYamlConfig: () => serialize(editor.config),
      getWorkflowFields: () => configPanelRef.current?.getWorkflowFields() ?? null,
      openIssuesPanel: () => {
        setTabs([TAB_DATA.ISSUES.ID])
        setActiveTab(TAB_DATA.ISSUES.ID)
      },
      clearAllResolvedFields: clearAllResolvedIssues,
    }))

    useEffect(() => {
      setLocked(isYamlTabVisible)
    }, [isYamlTabVisible])

    useEffect(() => {
      // Cmd+Z / Ctrl+Z
      const handleKeyDown = createUndoShortcut(handleUndo, editor.canUndo, isYamlTabVisible)

      window.addEventListener('keydown', handleKeyDown) // nosonar
      return () => window.removeEventListener('keydown', handleKeyDown) // nosonar
    }, [editor.canUndo, handleUndo, isYamlTabVisible])

    useEffect(() => {
      // Cmd+D / Ctrl+D
      const handleDuplicate = () => {
        if (editor.selectedNode) {
          executeWithUnsavedCheck(
            () => editor.selectedNode && editor.duplicateState(editor.selectedNode.id)
          )
        }
      }

      const handleKeyDown = createDuplicateShortcut(handleDuplicate, isYamlTabVisible)

      window.addEventListener('keydown', handleKeyDown) // nosonar
      return () => window.removeEventListener('keydown', handleKeyDown) // nosonar
    }, [editor.selectedNode, editor.duplicateState, isYamlTabVisible, executeWithUnsavedCheck])

    const adjustViewport = (isFullscreen) => {
      const viewport = isFullscreen ? VIEWPORT.FULLSCREEN : VIEWPORT.WINDOWED
      editor.fitView(viewport)
    }

    const handleConnect = React.useCallback(
      (connection) => {
        if (locked) return
        editor.onConnect(connection)
      },
      [locked, editor.onConnect]
    )

    const handleNodesChange = useCallback(
      (changes: NodeChange[]) => {
        executeWithUnsavedCheck(() => editor.onNodesChange(changes))
      },
      [editor, isConfigTabVisible]
    )

    const handleEdgesChange = useCallback(
      (changes) => {
        executeWithUnsavedCheck(() => editor.onEdgesChange(changes))
      },
      [editor, isConfigTabVisible]
    )

    const [activeIssue, setActiveIssue] = useState<WorkflowIssue | null>(null)
    const toggleTabs = useCallback(
      (newTabs: PanelTabId[]) => {
        executeWithUnsavedCheck(() => {
          editor.onSelectionReset()
          setActiveIssue(null)

          const result = isEqual(tabs, newTabs) ? [] : newTabs
          setTabs(result)

          if (!result.length) setActiveTab(null)
          setActiveTab(result[0])
        })
      },
      [editor.onSelectionReset, executeWithUnsavedCheck, tabs]
    )

    useEffect(() => {
      setTempIssues(issues)
    }, [editor.selectedNode?.id, issues?.length])

    const { issueMethods } = useWorkflowIssues({
      issues,
      selectedStateId: editor.selectedNode?.id ?? null,
      editorConfig: editor.config,
    })
    const {
      isIssueDirty,
      isIssueResolved,
      clearAllResolvedIssues,
      markIssueDirty,
      setDirtyIssues,
    } = issueMethods

    const [tempIssues, setTempIssues] = useState<WorkflowIssue[] | undefined | null>(issues)
    const {
      getIssueField,
      getToolIssue,
      getMcpIssue,
      goToField,
      clearAllDirtyMcpIssues,
      removeArrayIssue,
    } = useWorkflowFieldIssues({
      configStates: editor.config.states,
      activeIssue,
      selectedStateId: editor.selectedNode?.id ?? null,
      setDirtyIssues,
      isIssueDirty,
      isIssueResolved,
      markIssueDirty,
      openNodeTab: useCallback(
        (issue) => {
          toggleTabs([TAB_DATA.NODE.ID])
          setActiveTab(TAB_DATA.NODE.ID)
          setActiveIssue(issue)
        },
        [toggleTabs]
      ),
      openYamlTab: useCallback(
        (issue) => {
          toggleTabs([TAB_DATA.YAML.ID, TAB_DATA.CONFIGURATION.ID, TAB_DATA.ADVANCED.ID])
          setActiveTab(TAB_DATA.YAML.ID)
          setActiveIssue(issue)
        },
        [toggleTabs]
      ),
      openAdvancedConfigTab: useCallback(
        (issue) => {
          toggleTabs([TAB_DATA.CONFIGURATION.ID, TAB_DATA.ADVANCED.ID])
          setActiveTab(TAB_DATA.ADVANCED.ID)
          setActiveIssue(issue)
        },
        [toggleTabs]
      ),
      openState: useCallback(
        (stateId: string) => {
          editor.selectNode(stateId)
        },
        [editor.selectNode]
      ),
      issues: issues ?? null,
      tempIssues,
      setTempIssues,
    })

    useEffect(() => {
      adjustViewport(isFullscreen)
    }, [isFullscreen])

    useEffect(() => {
      if (!isFullscreen) editor.onSelectionReset()
    }, [])

    useEffect(() => {
      if (
        (activeTab === TAB_DATA.NODE.ID || activeTab === TAB_DATA.EDGE.ID) &&
        !editor.selectedNode &&
        !editor.selectedEdge
      ) {
        closeTabs()
      }
    }, [closeTabs, editor.selectedNode, editor.selectedEdge])

    const nodeCallbacks = useMemo(
      () => ({
        getConfig: editor.getConfig,
        findState: editor.findState,
        updateConfig: editor.updateConfig,
        removeState: editor.removeState,
        onNodesChange: editor.onNodesChange,
        isFullscreen,
      }),
      [
        editor.removeState,
        editor.updateConfig,
        editor.getConfig,
        editor.findState,
        editor.onNodesChange,
        isFullscreen,
      ]
    )

    const nodeHasError = useCallback(
      (node: WorkflowNode) => {
        return (
          issues
            ?.filter((issue) => issue.stateId === node.id)
            .filter((issue) => {
              if (isWorkflowAssistantToolIssue(issue)) return true
              return isFieldSupported(issue.path, node.type)
            })
            .some((issue) => !isIssueResolved(issue)) ?? false
        )
      },
      [issues, isIssueResolved, isIssueDirty]
    )

    const wrappedNodes = useMemo(() => {
      return editor.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          ...nodeCallbacks,
          hasError: nodeHasError(node),
        },
      }))
    }, [editor.nodes, nodeCallbacks, nodeHasError])

    const context = useMemo(
      () => ({
        issues: issues ?? null,
        activeIssue,
        selectedStateId: editor.selectedNode?.id ?? null,
        tempIssues,
        getIssueField,
        getToolIssue,
        getMcpIssue,
        goToField,
        setActiveIssue,
        clearAllDirtyMcpIssues,
        removeArrayIssue,
        setIssues,
        setTempIssues,
        ...issueMethods,
      }),
      [
        getIssueField,
        getToolIssue,
        getMcpIssue,
        goToField,
        activeIssue,
        editor.selectedNode?.id,
        issues,
        tempIssues,
        removeArrayIssue,
        issueMethods,
      ]
    )

    return (
      <WorkflowContext.Provider value={context}>
        {isExpanded && (
          <div className="fixed inset-0 z-40 bg-black/50" onClick={handleToggleExpand} />
        )}
        <div
          className={cn('flex flex-row overflow-hidden relative w-full', {
            'w-full h-full': isFullscreen,
            'h-[500px] rounded-lg border border-border-primary': !isFullscreen && !isExpanded,
            'fixed inset-0 z-50 h-full': isExpanded,
          })}
        >
          <EditorActions
            isFullscreen={isFullscreen}
            canUndo={editor.canUndo}
            hasValidationErrors={!!(issues && issues.length > 0)}
            onUndo={handleUndo}
            onLoadExample={onLoadExample ? handleLoadExample : undefined}
            onBeautify={handleBeautify}
            tabs={tabs}
            toggleTabs={toggleTabs}
          />

          {isFullscreen && <Sidebar createState={handleCreateState} disabled={locked} />}

          <ReactFlow
            nodes={wrappedNodes}
            edges={editor.edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeDrag={editor.onNodeDrag}
            onNodeDragStop={editor.onNodeDragStop}
            onSelectionChange={editor.onSelectionChange}
            onConnect={handleConnect}
            onBeforeDelete={editor.onBeforeDelete}
            nodeTypes={nodeTypeComponents}
            edgeTypes={edgeTypeComponents}
            fitView
            style={{ width: '100%', height: '100%' }}
            defaultViewport={VIEWPORT.DEFAULT}
            colorMode={isDark ? ColorMode.Dark : ColorMode.Light}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={DEFAULT_EDGE_OPTS}
            nodesDraggable={isFullscreen && !locked}
            nodesConnectable={isFullscreen && !locked}
            elementsSelectable={isFullscreen && !locked}
            edgesFocusable={isFullscreen && !locked}
            selectNodesOnDrag={false}
            deleteKeyCode={['Backspace', 'Delete']}
            minZoom={isFullscreen ? ZOOM.FULLSCREEN.MIN : ZOOM.WINDOWED.MIN}
            maxZoom={isFullscreen ? ZOOM.FULLSCREEN.MAX : ZOOM.WINDOWED.MAX}
          >
            <EditorBackground isFullscreen={isFullscreen} />

            <EditorControls
              isFullscreen={isFullscreen}
              locked={locked}
              onZoomIn={() => editor.zoomIn()}
              onZoomOut={() => editor.zoomOut()}
              onFitView={() => adjustViewport(isFullscreen)}
              onToggleLock={handleToggleLock}
              onDownloadImage={handleDownloadImage}
              disableLockToggle={isYamlTabVisible}
              isExpanded={isExpanded}
              onToggleExpand={!isFullscreen ? handleToggleExpand : undefined}
            />
          </ReactFlow>

          {isFullscreen && !!tabs.length && (
            <ConfigPanel
              ref={configPanelRef}
              workflow={workflow}
              yamlConfig={serialize(editor.config)}
              visibleTabs={tabs}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              toggleTabs={toggleTabs}
              selectedNode={editor.selectedNode}
              selectedEdge={editor.selectedEdge}
              config={editor.config}
              showIssuesPanel={tabs.includes(TAB_DATA.ISSUES.ID)}
              showYamlPanel={isYamlTabVisible}
              project={workflow?.project}
              isCollapsed={configPanelCollapsed}
              onCollapsedChange={setConfigPanelCollapsed}
              onUpdateConfig={editor.updateConfig}
              onUpdateWorkflow={onWorkflowUpdate}
              onUpdateYaml={onConfigurationUpdate}
              onClose={handleCloseConfigPanel}
              onDeleteNode={() => editor.selectedNode && editor.deleteNode(editor.selectedNode.id)}
              onDuplicateNode={() =>
                editor.selectedNode && editor.duplicateState(editor.selectedNode.id)
              }
              onDeleteConnection={editor.deleteConnection}
              onUpdateAdvancedConfig={editor.updateAdvancedConfig}
              pendingAction={pendingAction}
              setPendingAction={setPendingAction}
            />
          )}
        </div>
      </WorkflowContext.Provider>
    )
  }
)

WorkflowEditor.displayName = 'WorkflowEditor'

const WrappedWorkflowEditor = forwardRef<WorkflowEditorRef, WorkflowEditorProps>(
  ({ ...props }, ref) => (
    <ReactFlowProvider>
      <DnDProvider>
        <WorkflowEditor ref={ref} {...props} />
      </DnDProvider>
    </ReactFlowProvider>
  )
)

WrappedWorkflowEditor.displayName = 'WrappedWorkflowEditor'

export default WrappedWorkflowEditor
