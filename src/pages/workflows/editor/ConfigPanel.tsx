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
  Dispatch,
  SetStateAction,
} from 'react'

import ChevronRightIconSvg from '@/assets/icons/chevron-right.svg?react'
import CrossIconSvg from '@/assets/icons/cross.svg?react'
import Button from '@/components/Button'
import Tabs from '@/components/Tabs/Tabs'
import { ButtonType } from '@/constants'
import { FormIDs } from '@/constants/formIds'
import { useUnsavedChanges } from '@/hooks/useUnsavedChangesWarning'
import { WorkflowFormValues } from '@/pages/workflows/components/workflowSchema'
import { WorkflowIssue } from '@/types/entity'
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
import { PanelTab, PanelTabId, TAB_DATA } from './constants'
import { useWorkflowContext } from './hooks/useWorkflowContext'
import IssuesPanel from './IssuesPanel'

interface ConfigPanelProps {
  workflow?: any
  config: WorkflowConfiguration
  project?: string
  yamlConfig?: string
  visibleTabs: PanelTabId[]
  activeTab: PanelTabId | null
  toggleTabs: (tabs: PanelTabId[]) => void
  onActiveTabChange: (tab: PanelTabId) => void

  selectedNode?: WorkflowNode | null
  selectedEdge?: WorkflowEdge | null
  showIssuesPanel: boolean
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

  issues?: WorkflowIssue[]
  setIssues?: Dispatch<SetStateAction<WorkflowIssue[]>>
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

const nodeConfigPanels = {
  [NodeTypes.ASSISTANT]: AssistantTab,
  [NodeTypes.CUSTOM]: CustomTab,
  [NodeTypes.TOOL]: ToolTab,
  [NodeTypes.TRANSFORM]: TransformTab,
  [NodeTypes.CONDITIONAL]: ConditionalTab,
  [NodeTypes.SWITCH]: SwitchTab,
  [NodeTypes.ITERATOR]: IteratorTab,
}

const ConfigPanel = forwardRef<ConfigPanelRef, ConfigPanelProps>(
  (
    {
      workflow,
      config,
      selectedNode,
      selectedEdge,
      showIssuesPanel,
      project,
      visibleTabs,
      activeTab,
      onActiveTabChange,
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
    },
    ref
  ) => {
    const {
      issues,
      tempIssues,
      setIssues,
      setTempIssues,
      resolveAllDirtyIssues,
      clearAllDirtyIssues,
    } = useWorkflowContext()
    const [showUnsavedChangesConfirmation, setShowUnsavedChangesConfirmation] = useState(false)
    const [pendingTabSwitch, setPendingTabSwitch] = useState<PanelTabId | null>(null)
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

    const handleTabChange = useCallback(
      (newTab: PanelTabId) => {
        const isDirty = activeTabRef.current?.isDirty?.() ?? false

        if (isDirty) {
          setPendingTabSwitch(newTab)
          setShowUnsavedChangesConfirmation(true)
        } else {
          onActiveTabChange?.(newTab)
        }
      },
      [onActiveTabChange]
    )

    const handleClose = useCallback(
      (skipDirtyCheck = false) => {
        if (skipDirtyCheck) {
          onClose(true)
          clearAllDirtyIssues()
          setTempIssues(issues)
          return
        }

        const isDirty = activeTabRef.current?.isDirty?.() ?? false

        if (isDirty) {
          setShowUnsavedChangesConfirmation(true)
        } else {
          onClose()
          clearAllDirtyIssues()
          setTempIssues(issues)
        }
      },
      [onClose, clearAllDirtyIssues, issues, setTempIssues]
    )

    const handleChangesDiscard = useCallback(() => {
      setShowUnsavedChangesConfirmation(false)
      clearAllDirtyIssues()
      setTempIssues(issues)
      if (pendingTabSwitch) {
        onActiveTabChange?.(pendingTabSwitch)
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
    }, [
      onClose,
      pendingAction,
      setPendingAction,
      pendingTabSwitch,
      onActiveTabChange,
      clearAllDirtyIssues,
      issues,
      setTempIssues,
    ])

    const handleChangesSave = useCallback(async () => {
      // Temporarily unblock global navigation during save
      unblockTransition()

      const saveSuccessful = (await activeTabRef.current?.save()) ?? false
      resolveAllDirtyIssues()
      setShowUnsavedChangesConfirmation(false)
      setIssues?.(tempIssues ?? null)

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
        onActiveTabChange?.(pendingTabSwitch)
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
      onActiveTabChange,
      resolveAllDirtyIssues,
      tempIssues,
      setIssues,
    ])

    const triggerValidation = useCallback(async () => {
      onActiveTabChange?.(TAB_DATA.CONFIGURATION.ID)
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0)
      })
      await activeTabRef.current?.validate?.()
    }, [onActiveTabChange])

    const updateIssues = useCallback(() => {
      resolveAllDirtyIssues()
      clearAllDirtyIssues()
    }, [])

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

    const renderGeneralConfigTab = useCallback((): PanelTab => {
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
            ref={activeTabRef}
            defaultValues={defaultValues}
            onUpdate={handleWorkflowUpdate}
            onClose={handleClose}
          />
        ),
      }
    }, [workflow, handleWorkflowUpdate, handleClose])

    const renderAdvancedConfigTab = useCallback((): PanelTab => {
      return {
        id: TAB_DATA.ADVANCED.ID,
        label: TAB_DATA.ADVANCED.LABEL,
        element: (
          <AdvancedConfigTab
            ref={activeTabRef}
            config={config}
            workflow={workflow}
            onConfigChange={(values) => {
              onUpdateAdvancedConfig(values)
            }}
            onClose={handleClose}
          />
        ),
      }
    }, [config, workflow, onUpdateAdvancedConfig, handleClose])

    const renderNodeTab = useCallback((): PanelTab | null => {
      if (!selectedNode) return null

      const nodeType = selectedNode.type ?? NodeTypes.CUSTOM
      const NodePanel = nodeConfigPanels[nodeType]
      if (!NodePanel) return null

      return {
        id: TAB_DATA.NODE.ID,
        label: capitalize(nodeType),
        element: (
          <NodePanel
            ref={activeTabRef}
            key={selectedNode.id}
            stateId={selectedNode.id}
            config={config}
            onConfigChange={(values) => {
              updateIssues()
              onUpdateConfig(values)
            }}
            onClose={handleClose}
            onDelete={onDeleteNode}
            onDuplicate={onDuplicateNode}
            project={project ?? ''}
          />
        ),
      }
    }, [
      config,
      project,
      selectedNode,
      updateIssues,
      onUpdateConfig,
      handleClose,
      onDeleteNode,
      onDuplicateNode,
    ])

    const renderEdgeTab = useCallback((): PanelTab | null => {
      if (!selectedEdge) return null

      return {
        id: TAB_DATA.EDGE.ID,
        label: TAB_DATA.EDGE.LABEL,
        element: (
          <ConnectionTab
            key={selectedEdge.id}
            edge={selectedEdge}
            onDeleteConnection={onDeleteConnection ?? (() => {})}
            onClose={handleClose}
          />
        ),
      }
    }, [selectedEdge, onDeleteConnection, handleClose])

    const renderYamlTab = useCallback(
      (): PanelTab => ({
        id: TAB_DATA.YAML.ID,
        label: TAB_DATA.YAML.LABEL,
        element: (
          <YamlPanel
            ref={activeTabRef as any}
            key={yamlConfig}
            yaml={yamlConfig ?? ''}
            history={workflow?.yaml_config_history || []}
            onUpdate={onUpdateYaml}
            onClose={handleClose}
          />
        ),
      }),
      [yamlConfig, workflow?.yaml_config_history, onUpdateYaml, handleClose]
    )

    const renderIssuesTab = useCallback((): PanelTab => {
      return {
        id: TAB_DATA.ISSUES.ID,
        label: TAB_DATA.ISSUES.LABEL,
        element: <IssuesPanel />,
      }
    }, [])

    const tabs: PanelTab[] = useMemo(() => {
      const result: (PanelTab | null)[] = []

      visibleTabs.forEach((tab) => {
        switch (tab) {
          case TAB_DATA.NODE.ID:
            return result.push(renderNodeTab())
          case TAB_DATA.EDGE.ID:
            return result.push(renderEdgeTab())
          case TAB_DATA.YAML.ID:
            return result.push(renderYamlTab())
          case TAB_DATA.ISSUES.ID:
            return result.push(renderIssuesTab())
          case TAB_DATA.CONFIGURATION.ID:
            return result.push(renderGeneralConfigTab(), renderAdvancedConfigTab())
          default:
            return null
        }
      })

      return result.filter((result): result is PanelTab => !!result)
    }, [
      renderNodeTab,
      renderEdgeTab,
      renderYamlTab,
      renderIssuesTab,
      renderGeneralConfigTab,
      renderAdvancedConfigTab,
    ])

    const panelHeader = useMemo(() => {
      if (selectedNode) return CONFIG_PANEL_HEADERS.NODE
      if (selectedEdge) return CONFIG_PANEL_HEADERS.CONNECTION
      if (showIssuesPanel) return CONFIG_PANEL_HEADERS.ISSUES
      return CONFIG_PANEL_HEADERS.WORKFLOW
    }, [selectedNode, selectedEdge, showIssuesPanel])

    const showTabs = tabs.length > 1

    useEffect(() => {
      const configTabs: PanelTabId[] = [
        TAB_DATA.CONFIGURATION.ID,
        TAB_DATA.ADVANCED.ID,
        TAB_DATA.YAML.ID,
      ]
      if (activeTab && configTabs.includes(activeTab)) {
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
            'w-[400px] max-w-[400px]': !isCollapsed && showIssuesPanel,
            'w-96 max-w-[340px]':
              !isCollapsed && activeTab !== TAB_DATA.YAML.ID && activeTab !== TAB_DATA.ISSUES.ID,
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
