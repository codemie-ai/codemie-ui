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

import capitalize from 'lodash/capitalize'
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  Ref,
} from 'react'

import ChevronRightIconSvg from '@/assets/icons/chevron-right.svg?react'
import CrossIconSvg from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { ButtonType } from '@/constants'
import { FormIDs } from '@/constants/formIds'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { WorkflowFormValues } from '@/pages/workflows/components/workflowSchema'
import { WorkflowNode, WorkflowEdge, NodeTypes } from '@/types/workflowEditor/base'
import { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { cn } from '@/utils/utils'
import { ConfigurationUpdate } from '@/utils/workflowEditor'
import { CONFIG_PANEL_HEADERS } from '@/utils/workflowEditor/constants'

import AdvancedConfigTab from './configPanels/AdvancedConfigTab'
import AssistantTab from './configPanels/AssistantTab'
import ConditionalTab from './configPanels/ConditionalTab'
import ConnectionTab from './configPanels/ConnectionTab'
import CustomTab from './configPanels/CustomTab'
import GeneralConfigTab from './configPanels/GeneralConfigTab'
import IteratorTab from './configPanels/IteratorTab'
import SwitchTab from './configPanels/SwitchTab'
import ToolTab from './configPanels/ToolTab'
import TransformTab from './configPanels/TransformTab'
import UnsavedChangesConfirmation from './configPanels/UnsavedChangesConfirmation'
import YamlPanel from './configPanels/YamlPanel'

interface ConfigPanelProps {
  workflow?: any
  config: WorkflowConfiguration
  project?: string
  yamlConfig?: string

  selectedNode?: WorkflowNode | null
  selectedEdge?: WorkflowEdge | null
  showYamlPanel?: boolean
  isCollapsed?: boolean

  onUpdateConfig: (updates: ConfigurationUpdate) => void
  onUpdateAdvancedConfig: (advancedConfig: Partial<WorkflowConfiguration>) => void
  onUpdateWorkflow?: (values: any) => void
  onUpdateYaml: (yaml: string) => void
  onDeleteNode: () => void
  onDuplicateNode: () => void
  onDeleteConnection: (edgeId: string) => void
  onClose: (forceCloseAll?: boolean) => void
  onCollapsedChange?: (collapsed: boolean) => void
  pendingAction?: (() => void) | null
  setPendingAction?: (action: (() => void) | null) => void
  stateErrors?: Map<string, string>
  onClearStateError?: (stateId: string) => void
}

export interface ConfigPanelRef {
  triggerGeneralConfigValidation: () => Promise<void>
  isDirty: () => boolean
  showUnsavedChangesDialog: () => void
  save: () => Promise<boolean | null>
  getWorkflowFields: () => WorkflowFormValues | null
}

interface ConfigTab {
  isDirty: () => boolean
  save: () => Promise<boolean>
  validate?: () => Promise<boolean>
  getValues?: () => any
}

interface RenderNodeTabParams {
  node: WorkflowNode
  config: WorkflowConfiguration
  project: string
  onUpdateConfig?: (updates: ConfigurationUpdate) => void
  onClose?: (skipDirtyCheck?: boolean) => void
  onDeleteNode?: () => void
  onDuplicateNode?: () => void
  ref?: Ref<ConfigTab>
  stateErrors?: Map<string, string>
  onClearStateError?: (stateId: string) => void
}

interface RenderGeneralConfigTabParams {
  workflow: any
  onUpdateWorkflow: (values: any) => void
  onClose: (skipDirtyCheck?: boolean) => void
  ref: Ref<ConfigTab>
}

interface RenderAdvancedConfigTabParams {
  config: WorkflowConfiguration
  workflow?: any
  onUpdateAdvancedConfig: (updates: Partial<WorkflowConfiguration>) => void
  onClose: (skipDirtyCheck?: boolean) => void
  ref: Ref<ConfigTab>
}

interface RenderEdgeTabParams {
  edge: WorkflowEdge
  onClose: () => void
  onDeleteConnection?: (edgeId: string) => void
}

const TAB_DATA = {
  CONFIGURATION: { ID: 'configuration', LABEL: 'Basic' },
  ADVANCED: { ID: 'advanced', LABEL: 'Advanced' },
  NODE: { ID: 'node', LABEL: '' },
  EDGE: { ID: 'edge', LABEL: 'Connection' },
  YAML: { ID: 'yaml', LABEL: 'YAML' },
}

const renderGeneralConfigTab = ({
  workflow,
  onUpdateWorkflow,
  onClose,
  ref,
}: RenderGeneralConfigTabParams): Tab => {
  const defaultValues = workflow
    ? {
        name: workflow.name ?? '',
        project: workflow.project ?? '',
        description: workflow.description ?? '',
        icon_url: workflow.icon_url ?? '',
        shared: workflow.shared ?? false,
        guardrail_assignments: workflow.guardrail_assignments ?? [],
      }
    : undefined

  return {
    id: TAB_DATA.CONFIGURATION.ID,
    label: TAB_DATA.CONFIGURATION.LABEL,
    element: (
      <GeneralConfigTab
        ref={ref}
        defaultValues={defaultValues}
        onUpdate={onUpdateWorkflow}
        onClose={onClose}
      />
    ),
  }
}

const renderAdvancedConfigTab = ({
  config,
  workflow,
  onUpdateAdvancedConfig,
  onClose,
  ref,
}: RenderAdvancedConfigTabParams): Tab => {
  return {
    id: TAB_DATA.ADVANCED.ID,
    label: TAB_DATA.ADVANCED.LABEL,
    element: (
      <AdvancedConfigTab
        ref={ref}
        config={config}
        workflow={workflow}
        onConfigChange={onUpdateAdvancedConfig}
        onClose={onClose}
      />
    ),
  }
}

const renderNodeTab = ({
  node,
  config,
  project,
  onUpdateConfig,
  onClose,
  onDeleteNode,
  onDuplicateNode,
  ref,
  stateErrors,
  onClearStateError,
}: RenderNodeTabParams): Tab | null => {
  const nodeType = node.type ?? NodeTypes.CUSTOM
  const nodeConfigPanels = {
    [NodeTypes.ASSISTANT]: AssistantTab,
    [NodeTypes.CUSTOM]: CustomTab,
    [NodeTypes.TOOL]: ToolTab,
    [NodeTypes.TRANSFORM]: TransformTab,
    [NodeTypes.CONDITIONAL]: ConditionalTab,
    [NodeTypes.SWITCH]: SwitchTab,
    [NodeTypes.ITERATOR]: IteratorTab,
  }

  const NodePanel = nodeConfigPanels[nodeType]

  if (!NodePanel) return null

  const validationError = stateErrors?.get(node.id)

  return {
    id: TAB_DATA.NODE.ID,
    label: capitalize(nodeType),
    element: (
      <NodePanel
        ref={ref}
        key={node.id}
        stateId={node.id}
        config={config}
        onConfigChange={onUpdateConfig}
        onClose={onClose ?? (() => {})}
        onDelete={onDeleteNode}
        onDuplicate={onDuplicateNode}
        project={project}
        validationError={validationError}
        onClearStateError={onClearStateError}
      />
    ),
  }
}

const renderEdgeTab = ({ edge, onClose, onDeleteConnection }: RenderEdgeTabParams): Tab => {
  return {
    id: TAB_DATA.EDGE.ID,
    label: TAB_DATA.EDGE.LABEL,
    element: (
      <ConnectionTab
        key={edge.id}
        edge={edge}
        onDeleteConnection={onDeleteConnection ?? (() => {})}
        onClose={onClose}
      />
    ),
  }
}

interface RenderYamlTabParams {
  yaml: string
  history: any[]
  onUpdate: (yaml: string) => void
  onClose: (forceCloseAll?: boolean) => void
  ref?: Ref<ConfigTab>
}

const renderYamlTab = ({ yaml, history, onUpdate, onClose, ref }: RenderYamlTabParams): Tab => {
  return {
    id: TAB_DATA.YAML.ID,
    label: TAB_DATA.YAML.LABEL,
    element: (
      <YamlPanel
        ref={ref as any}
        key={yaml}
        yaml={yaml}
        history={history}
        onUpdate={onUpdate}
        onClose={onClose}
      />
    ),
  }
}

const ConfigPanel = forwardRef<ConfigPanelRef, ConfigPanelProps>(
  (
    {
      workflow,
      config,
      selectedNode,
      selectedEdge,
      showYamlPanel,
      project,
      yamlConfig,
      isCollapsed = false,
      onUpdateConfig,
      onUpdateAdvancedConfig,
      onUpdateWorkflow,
      onUpdateYaml,
      onClose,
      onDeleteNode,
      onDuplicateNode,
      onDeleteConnection,
      onCollapsedChange,
      pendingAction,
      setPendingAction,
      stateErrors,
      onClearStateError,
    },
    ref
  ) => {
    const [activeTab, setActiveTab] = useState<string>()
    const [showUnsavedChangesConfirmation, setShowUnsavedChangesConfirmation] = useState(false)
    const [pendingTabSwitch, setPendingTabSwitch] = useState<string | null>(null)
    const activeTabRef = useRef<ConfigTab>(null)

    // Global unsaved changes tracking - unblock/block navigation during save
    const { unblockTransition, blockTransition } = useUnsavedChanges({
      formId: FormIDs.WORKFLOW_CONFIG_PANEL,
      getCurrentValues: () => {
        const isDirty = activeTabRef.current?.isDirty() ?? false
        return { isDirty }
      },
      comparator: (_initial, current) => {
        // Always check if there are unsaved changes
        // Don't compare with initial, because initial will always be false on mount
        return current?.isDirty ?? false
      },
    })

    const handleWorkflowUpdate = useCallback(
      (values: any) => {
        onUpdateWorkflow?.(values)
      },
      [onUpdateWorkflow]
    )

    const handleTabChange = useCallback((newTab: string) => {
      const isDirty = activeTabRef.current?.isDirty?.() ?? false

      if (isDirty) {
        setPendingTabSwitch(newTab)
        setShowUnsavedChangesConfirmation(true)
      } else {
        setActiveTab(newTab)
      }
    }, [])

    const handleClose = useCallback(
      (skipDirtyCheck = false) => {
        if (skipDirtyCheck) {
          onClose(true)
          return
        }

        const isDirty = activeTabRef.current?.isDirty?.() ?? false

        if (isDirty) {
          setShowUnsavedChangesConfirmation(true)
        } else {
          onClose()
        }
      },
      [onClose]
    )

    const handleChangesDiscard = useCallback(() => {
      setShowUnsavedChangesConfirmation(false)
      if (pendingTabSwitch) {
        setActiveTab(pendingTabSwitch)
        setPendingTabSwitch(null)
      } else if (pendingAction) {
        onClose(true)
        setTimeout(() => {
          pendingAction()
          setPendingAction?.(null)
        })
      } else {
        onClose(true)
      }
    }, [onClose, pendingAction, setPendingAction, pendingTabSwitch])

    const handleChangesSave = useCallback(async () => {
      // Temporarily unblock global navigation during save
      unblockTransition()

      const saveSuccessful = (await activeTabRef.current?.save()) ?? false

      setShowUnsavedChangesConfirmation(false)

      if (!saveSuccessful) {
        setPendingTabSwitch(null)
        setPendingAction?.(null)
        // Re-block navigation if save failed
        setTimeout(() => {
          blockTransition()
        }, 100)
        return
      }

      // Re-block navigation after successful save
      setTimeout(() => {
        blockTransition()
      }, 100)

      if (pendingTabSwitch) {
        setActiveTab(pendingTabSwitch)
        setPendingTabSwitch(null)
        return
      }

      if (pendingAction) {
        onClose(true)
        setTimeout(() => {
          pendingAction()
          setPendingAction?.(null)
        }, 0)
        return
      }

      onClose(true)
    }, [
      pendingTabSwitch,
      pendingAction,
      onClose,
      setPendingAction,
      unblockTransition,
      blockTransition,
    ])

    const triggerValidation = async () => {
      setActiveTab(TAB_DATA.CONFIGURATION.ID)
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
      await activeTabRef.current?.validate?.()
    }

    useImperativeHandle(
      ref,
      () => ({
        triggerGeneralConfigValidation: triggerValidation,
        isDirty: () => activeTabRef.current?.isDirty?.() ?? false,
        showUnsavedChangesDialog: () => setShowUnsavedChangesConfirmation(true),
        save: async () => (await activeTabRef.current?.save()) ?? null,
        getWorkflowFields: () => {
          if (activeTab === TAB_DATA.CONFIGURATION.ID) {
            return activeTabRef.current?.getValues?.() ?? null
          }

          return null
        },
      }),
      [triggerValidation, activeTab]
    )

    const tabs: Tab[] = useMemo(() => {
      const result: Tab[] = []

      if (selectedNode) {
        const nodeTab = renderNodeTab({
          node: selectedNode,
          config,
          project: project ?? '',
          onUpdateConfig,
          onClose: handleClose,
          onDeleteNode,
          onDuplicateNode,
          ref: activeTabRef,
          stateErrors,
          onClearStateError,
        })

        if (nodeTab) result.push(nodeTab)
      } else if (selectedEdge) {
        result.push(
          renderEdgeTab({
            edge: selectedEdge,
            onClose: handleClose,
            onDeleteConnection,
          })
        )
      } else if (showYamlPanel && yamlConfig) {
        result.push(
          renderYamlTab({
            yaml: yamlConfig,
            history: workflow?.yaml_config_history || [],
            onUpdate: onUpdateYaml,
            onClose: handleClose,
            ref: activeTabRef,
          })
        )
      }

      // Only add workflow configuration tabs when no node is selected
      if (!selectedNode && !selectedEdge) {
        result.push(
          renderGeneralConfigTab({
            workflow,
            onUpdateWorkflow: handleWorkflowUpdate,
            onClose: handleClose,
            ref: activeTabRef,
          }),
          renderAdvancedConfigTab({
            config,
            workflow,
            onUpdateAdvancedConfig,
            onClose: handleClose,
            ref: activeTabRef,
          })
        )
      }

      return result
    }, [
      selectedNode,
      selectedEdge,
      showYamlPanel,
      yamlConfig,
      handleClose,
      config,
      project,
      onUpdateConfig,
      onDeleteNode,
      onDuplicateNode,
      onDeleteConnection,
      workflow,
      handleWorkflowUpdate,
      onUpdateAdvancedConfig,
      onUpdateYaml,
      stateErrors,
      onClearStateError,
    ])

    const panelHeader = useMemo(() => {
      if (selectedNode) return CONFIG_PANEL_HEADERS.NODE
      if (selectedEdge) return CONFIG_PANEL_HEADERS.CONNECTION
      return CONFIG_PANEL_HEADERS.WORKFLOW
    }, [selectedNode, selectedEdge])

    const showTabs = tabs.length > 1

    useEffect(() => {
      let tab

      if (selectedNode) tab = TAB_DATA.NODE.ID
      else if (selectedEdge) tab = TAB_DATA.EDGE.ID
      else if (showYamlPanel) tab = TAB_DATA.YAML.ID
      else tab = TAB_DATA.CONFIGURATION.ID

      setActiveTab(tab)
    }, [selectedNode, selectedEdge, showYamlPanel])

    useEffect(() => {
      if (
        [TAB_DATA.CONFIGURATION.ID, TAB_DATA.ADVANCED.ID, TAB_DATA.YAML.ID].includes(
          activeTab ?? ''
        )
      ) {
        onCollapsedChange?.(false)
      }
    }, [activeTab, onCollapsedChange])

    const toggleCollapsed = useCallback(() => {
      onCollapsedChange?.(!isCollapsed)
    }, [isCollapsed, onCollapsedChange])

    return (
      <aside
        className={cn(
          'absolute top-[60px] right-4 bg-surface-base-chat',
          'flex flex-col z-20',
          'border border-border-structural rounded-lg shadow-lg max-h-[calc(100%-120px)]',
          'transition-all duration-100',
          {
            'w-[500px] max-w-[500px]': !isCollapsed && activeTab === TAB_DATA.YAML.ID,
            'w-96 max-w-[340px]': !isCollapsed && activeTab !== TAB_DATA.YAML.ID,
            'max-w-96 w-96':
              !isCollapsed &&
              selectedNode &&
              [NodeTypes.ASSISTANT, NodeTypes.CUSTOM, NodeTypes.TOOL, NodeTypes.TRANSFORM].includes(
                selectedNode.type as any
              ),
            'w-80 max-w-80': isCollapsed,
          }
        )}
      >
        <div
          className={cn(
            // nosonar
            'flex items-center justify-between px-4 py-3 sticky top-0 bg-surface-base-chat z-10 gap-2 cursor-pointer',
            'border-b border-border-structural rounded-t-lg',
            {
              'rounded-lg border-none': isCollapsed,
            }
          )}
          onClick={toggleCollapsed}
        >
          <h3 className="text-sm font-semibold text-text-primary select-none">{panelHeader}</h3>
          <div className="flex items-center gap-1">
            <Button
              type={ButtonType.TERTIARY}
              aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
              className="opacity-75"
            >
              <ChevronRightIconSvg
                className={cn('w-4 h-4 transition-transform', {
                  'rotate-90': !isCollapsed,
                })}
              />
            </Button>
            <Button
              type={ButtonType.SECONDARY}
              onClick={(e) => {
                e.stopPropagation()
                handleClose()
              }}
            >
              <CrossIconSvg className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div
          className={cn('overflow-hidden flex flex-col transition-all duration-150 ease-in-out', {
            'max-h-[2000px] opacity-100': !isCollapsed,
            'max-h-0 opacity-0': isCollapsed,
          })}
        >
          <div className="overflow-y-auto show-scroll px-4 py-0">
            <div className="flex flex-col gap-4 h-full">
              {showTabs ? (
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onChange={handleTabChange}
                  isSmall
                  alwaysShowTabs
                  headerClassName="sticky top-0 pt-2 bg-surface-base-chat z-10"
                  className="h-full flex flex-col"
                />
              ) : (
                <div className="pt-4">{tabs[0]?.element}</div>
              )}
            </div>
          </div>
        </div>

        <UnsavedChangesConfirmation
          visible={showUnsavedChangesConfirmation}
          onDiscard={handleChangesDiscard}
          onSave={handleChangesSave}
        />
      </aside>
    )
  }
)

ConfigPanel.displayName = 'ConfigPanel'

export default ConfigPanel
