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

import { ReactFlow, ReactFlowProvider, NodeChange } from '@xyflow/react'
import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react'
import '@xyflow/react/dist/style.css'

import { useEscapeKey } from '@/hooks/useEscapeKey'
import { DnDProvider } from '@/hooks/useReactFlowDnD'
import { useTheme } from '@/hooks/useTheme'
import useWorkflowEditor from '@/hooks/useWorkflowEditor'
import { WorkflowFormValues } from '@/pages/workflows/components/workflowSchema'
import { NodeType } from '@/types/workflowEditor/base'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'
import {
  handleWorkflowErrors,
  WorkflowValidationError,
  CategorizedWorkflowErrors,
} from '@/utils/workflowEditor/helpers/backendErrorHandler'
import { downloadWorkflowImage } from '@/utils/workflowEditor/helpers/export/downloadWorkflowImage'
import { isStartOrEndNode, isNoteNode } from '@/utils/workflowEditor/helpers/nodes/nodeTypeCheckers'
import { serialize } from '@/utils/workflowEditor/serialization'

import ConfigPanel, { ConfigPanelRef } from './ConfigPanel'
import BackwardsEdge from './edges/BackwardsEdge'
import EditorActions from './EditorActions'
import EditorBackground from './EditorBackground'
import EditorControls from './EditorControls'
import { nodeTypeComponents } from './nodes'
import Sidebar from './Sidebar'

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
  validationErrors?: Record<string, any>
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
      validationErrors,
    },
    ref
  ) => {
    const { isDark } = useTheme()
    const [locked, setLocked] = useState(false)
    const [showConfigPanel, setShowConfigPanel] = useState(false)
    const [showWorkflowConfig, setShowWorkflowConfig] = useState(false)
    const [showYamlPanel, setShowYamlPanel] = useState(false)
    const [configPanelCollapsed, setConfigPanelCollapsed] = useState(false)
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
    const [errors, setErrors] = useState<CategorizedWorkflowErrors | null>()
    const configPanelRef = useRef<ConfigPanelRef>(null)

    const editor = useWorkflowEditor(yamlConfig, onConfigurationUpdate)

    // expand in readonly mode logic
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

    const handleClearStateError = useCallback(
      (stateId: string) => {
        if (!errors?.stateErrors) return

        const newStateErrors = new Map(errors.stateErrors)
        newStateErrors.delete(stateId)

        setErrors({
          ...errors,
          stateErrors: newStateErrors,
        })
      },
      [errors]
    )

    const handleCloseConfigPanel = (forceClose = false) => {
      if (!forceClose && configPanelRef.current?.isDirty()) {
        configPanelRef.current?.showUnsavedChangesDialog()
        return
      }

      if (editor.selectedNode || editor.selectedEdge) {
        editor.onSelectionReset()
      }

      setShowYamlPanel(false)
      setShowWorkflowConfig(false)
    }

    const handleToggleLock = () => {
      setLocked(!locked)
    }

    const executeWithUnsavedCheck = (action: () => void) => {
      if (configPanelRef.current?.isDirty()) {
        setPendingAction(() => action)
        configPanelRef.current?.showUnsavedChangesDialog()
        return false
      }
      action()
      return true
    }

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
        setShowYamlPanel(false)
        setShowWorkflowConfig(true)
        setShowConfigPanel(true)
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
    }))

    useEffect(() => {
      setLocked(showYamlPanel)
    }, [showYamlPanel])

    useEffect(() => {
      // Cmd+Z / Ctrl+Z
      const handleKeyDown = createUndoShortcut(handleUndo, editor.canUndo, showYamlPanel)

      window.addEventListener('keydown', handleKeyDown) // nosonar
      return () => window.removeEventListener('keydown', handleKeyDown) // nosonar
    }, [editor.canUndo, handleUndo, showYamlPanel])

    useEffect(() => {
      // Cmd+D / Ctrl+D
      const handleDuplicate = () => {
        if (editor.selectedNode) {
          executeWithUnsavedCheck(
            () => editor.selectedNode && editor.duplicateState(editor.selectedNode.id)
          )
        }
      }

      const handleKeyDown = createDuplicateShortcut(handleDuplicate, showYamlPanel)

      window.addEventListener('keydown', handleKeyDown) // nosonar
      return () => window.removeEventListener('keydown', handleKeyDown) // nosonar
    }, [editor.selectedNode, editor.duplicateState, showYamlPanel, executeWithUnsavedCheck])

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
      [editor, showConfigPanel]
    )

    const handleEdgesChange = useCallback(
      (changes) => {
        executeWithUnsavedCheck(() => editor.onEdgesChange(changes))
      },
      [editor, showConfigPanel]
    )

    useEffect(() => {
      adjustViewport(isFullscreen)
    }, [isFullscreen])

    useEffect(() => {
      const validNode =
        editor.selectedNode &&
        !isStartOrEndNode(editor.selectedNode) &&
        !isNoteNode(editor.selectedNode)
      const show = validNode || editor.selectedEdge || showWorkflowConfig || showYamlPanel

      if (validNode || editor.selectedEdge) setShowWorkflowConfig(false)
      if (!show && !editor.selectedNode) handleCloseConfigPanel()

      setShowConfigPanel(!!show)
    }, [editor.selectedNode, editor.selectedEdge, showWorkflowConfig, showYamlPanel])

    useEffect(() => {
      // Clear selection for windowed mode
      if (!isFullscreen) editor.onSelectionReset()
    }, [])

    useEffect(() => {
      if (!validationErrors) return

      const handledErrors = handleWorkflowErrors(validationErrors as WorkflowValidationError)
      if (handledErrors.generalError) toaster.error(handledErrors.generalError)
      setErrors(handledErrors)
    }, [validationErrors])

    const nodeCallbacks = React.useMemo(
      () => ({
        getConfig: editor.getConfig,
        findState: editor.findState,
        updateConfig: editor.updateConfig,
        removeState: editor.removeState,
        onNodesChange: editor.onNodesChange,
        isFullscreen,
        stateErrors: errors?.stateErrors,
      }),
      [
        editor.removeState,
        editor.updateConfig,
        editor.getConfig,
        editor.findState,
        editor.onNodesChange,
        isFullscreen,
        validationErrors?.stateErrors,
      ]
    )

    const wrappedNodes = React.useMemo(() => {
      return editor.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          ...nodeCallbacks,
        },
      }))
    }, [editor.nodes, nodeCallbacks])

    return (
      <>
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
            showWorkflowConfig={showWorkflowConfig}
            showYamlPanel={showYamlPanel}
            canUndo={editor.canUndo}
            onUndo={handleUndo}
            onLoadExample={onLoadExample ? handleLoadExample : undefined}
            onBeautify={handleBeautify}
            onShowYaml={() => {
              executeWithUnsavedCheck(() => {
                editor.onSelectionReset()
                setShowWorkflowConfig(false)
                setShowYamlPanel((prev) => !prev)
              })
            }}
            onToggleWorkflowConfig={() => {
              executeWithUnsavedCheck(() => {
                editor.onSelectionReset()
                setShowYamlPanel(false)
                setShowWorkflowConfig((prev) => !prev)
              })
            }}
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
              disableLockToggle={showYamlPanel}
              isExpanded={isExpanded}
              onToggleExpand={!isFullscreen ? handleToggleExpand : undefined}
            />
          </ReactFlow>

          {isFullscreen && showConfigPanel && (
            <ConfigPanel
              ref={configPanelRef}
              workflow={workflow}
              yamlConfig={yamlConfig}
              selectedNode={editor.selectedNode}
              selectedEdge={editor.selectedEdge}
              config={editor.config}
              showYamlPanel={showYamlPanel}
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
              stateErrors={errors?.stateErrors}
              onClearStateError={handleClearStateError}
            />
          )}
        </div>
      </>
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
