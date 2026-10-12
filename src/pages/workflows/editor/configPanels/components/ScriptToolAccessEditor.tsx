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

import omit from 'lodash/omit'
import { FC, useMemo, useState } from 'react'

import ConfigureSvg from '@/assets/icons/configure.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { AssistantFormContext } from '@/pages/assistants/components/AssistantForm/AssistantForm'
import ToolsConfiguration, {
  SECTION,
} from '@/pages/assistants/components/AssistantForm/components/Toolkits/ToolsConfiguration'
import { AssistantToolkit } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { filterToolkitsByToolFilter } from '@/utils/toolkit'
import { isToolInToolkits, ScriptToolAccessItem } from '@/utils/workflowEditor/scriptToolAccess'
import { getToolkitsFromConfiguration, getToolsFromToolkits } from '@/utils/workflows'

interface ScriptToolAccessEditorProps {
  value: ScriptToolAccessItem[]
  onChange: (value: ScriptToolAccessItem[]) => void
  /** The whole tool catalog; the editor narrows it with `toolFilter`. */
  toolkits: AssistantToolkit[]
  /** Integrations of the workflow's project (and global ones), by credential type. */
  settings: Record<string, Setting[]>
  project: string
  toolFilter?: Record<string, unknown>
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  isGlobal?: boolean
  isCreator?: boolean
  /** Label and help come from the backend (`step_config.props`) and are shown as they are. */
  label?: string
  help?: string
  /** Backend issues of the field and of its rows, shown under the block. */
  errors?: string[]
}

/**
 * Tools a workspace script may call, picked in the same dialog an assistant uses for its tools: a
 * tool with an integration runs under it, a tool without one uses the automatic lookup.
 */
const ScriptToolAccessEditor: FC<ScriptToolAccessEditorProps> = ({
  value,
  onChange,
  toolkits,
  settings,
  project,
  toolFilter,
  showNewIntegrationPopup,
  isGlobal,
  isCreator,
  label = 'Tools',
  help,
  errors = [],
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [staged, setStaged] = useState<AssistantToolkit[]>([])

  const formContext = useMemo(() => ({ project, isChatConfig: true }), [project])
  const hasAlias = value.some((item) => item.integration_alias)

  const handleOpen = () => {
    const callable = filterToolkitsByToolFilter(toolkits, toolFilter)
    // A saved tool the dialog cannot show would be impossible to remove there; it is dropped on
    // Apply and the backend keeps reporting it until then.
    const editable = value.filter((item) => isToolInToolkits(item.name, callable))
    setStaged(getToolkitsFromConfiguration(editable, callable, settings))
    setIsOpen(true)
  }

  const handleSubmit = () => {
    const previous = new Map(value.map((item) => [item.name, item]))

    // Other keys of a saved item survive; no alias is the absence of the key (YAML cannot hold
    // `undefined`).
    onChange(
      getToolsFromToolkits(staged).map(({ name, integration_alias }) => ({
        ...omit(previous.get(name), 'integration_alias'),
        name,
        ...(integration_alias ? { integration_alias } : {}),
      }))
    )
    setIsOpen(false)
  }

  return (
    <div className="flex flex-col gap-2" data-testid="script-tool-access">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-text-primary min-w-0">{label}</div>
        <Button
          type={ButtonType.SECONDARY}
          className="shrink-0"
          onClick={handleOpen}
          data-tooltip-id="react-tooltip"
          data-tooltip-content={`Configure: ${label}`}
          aria-label={`Configure: ${label}`}
        >
          <ConfigureSvg />
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-text-quaternary">No tools selected</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm text-text-secondary">
          {value.map((item, index) => (
            // eslint-disable-next-line react/no-array-index-key -- a duplicate name is possible until the backend rejects it
            <li key={`${item.name}-${index}`}>
              <span className="font-medium text-text-primary">{item.name}</span>
              {item.integration_alias && (
                <span className="text-text-quaternary">{` · ${item.integration_alias}`}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isGlobal && hasAlias && (
        <p className="text-xs text-text-quaternary">
          This workflow is global: tools with an integration run under the integration of the
          workflow author for everyone who runs it.
          {isCreator === false &&
            ' You are not the author, so those integrations are checked against the author, not you.'}
        </p>
      )}

      {errors.map((message) => (
        <p key={message} className="text-text-error text-sm">
          {message}
        </p>
      ))}

      <Popup
        visible={isOpen}
        onHide={() => setIsOpen(false)}
        onSubmit={handleSubmit}
        header={label}
        submitText="Apply"
        cancelText="Cancel"
        limitWidth={false}
        className="w-full max-w-4xl"
      >
        <div className="p-4">
          <AssistantFormContext.Provider value={formContext}>
            <ToolsConfiguration
              toolkits={staged}
              mcpServers={[]}
              onToolkitsChange={setStaged}
              onMcpServersChange={() => {}}
              showNewIntegrationPopup={showNewIntegrationPopup}
              showMcpServers={false}
              showExternalTools={false}
              showWrapper={false}
              toolFilter={toolFilter}
              defaultOpenSection={SECTION.TOOLS}
              availableToolsDescription={help ?? ''}
            />
          </AssistantFormContext.Provider>
        </div>
      </Popup>
    </div>
  )
}

export default ScriptToolAccessEditor
