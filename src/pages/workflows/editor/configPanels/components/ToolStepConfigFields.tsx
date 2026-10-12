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

import { FC } from 'react'

import YamlEditor from '@/components/form/YamlEditor/YamlEditor'
import { AssistantToolkit, ToolStepConfigItem } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { toScriptToolAccess } from '@/utils/workflowEditor/scriptToolAccess'

import ScriptToolAccessEditor from './ScriptToolAccessEditor'

import type { GetIssueField } from '../../hooks/useWorkflowFieldIssues'

export const TOOL_INTEGRATION_PICKER = 'tool_integration_picker'

interface ToolStepConfigFieldsProps {
  stepConfig: ToolStepConfigItem[]
  values: Record<string, unknown>
  onChange: (field: string, value: unknown) => void
  toolkits: AssistantToolkit[]
  settings: Record<string, Setting[]>
  getIssueField: GetIssueField
  /** Project of the workflow: only its integrations (and global ones) are offered. */
  project: string
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  isGlobal?: boolean
  isCreator?: boolean
}

// Same rule as the assistant toolkit editor: the workflow's project integrations plus global ones.
const filterSettingsByProject = (
  settings: Record<string, Setting[]>,
  project: string
): Record<string, Setting[]> => {
  return Object.fromEntries(
    Object.entries(settings ?? {}).map(([type, list]) => [
      type,
      list.filter((setting) => setting.project_name === project || setting.is_global),
    ])
  )
}

/**
 * Renders the editors a tool asks for in its schema (`step_config`). The component name comes from
 * the backend; an unknown one falls back to a YAML editor of the field plus the backend's help.
 */
const ToolStepConfigFields: FC<ToolStepConfigFieldsProps> = ({
  stepConfig,
  values,
  onChange,
  toolkits,
  settings,
  getIssueField,
  project,
  showNewIntegrationPopup,
  isGlobal,
  isCreator,
}) => {
  const projectSettings = filterSettingsByProject(settings, project)

  return (
    <>
      {stepConfig.map((item) => {
        const issue = getIssueField(item.field)
        const props = item.props ?? {}

        if (item.component === TOOL_INTEGRATION_PICKER) {
          const items = toScriptToolAccess(values[item.field])
          // The backend reports the row in the path: <field>.<i>.name or <field>.<i>.integration_alias
          const rowIssues = items.flatMap((_, index) => [
            getIssueField(`${item.field}.${index}.name`),
            getIssueField(`${item.field}.${index}.integration_alias`),
          ])
          const errors = Array.from(
            new Set(
              [issue.fieldError, ...rowIssues.map((rowIssue) => rowIssue.fieldError)].filter(
                (message): message is string => Boolean(message)
              )
            )
          )

          return (
            <div key={item.field} ref={issue.ref as any}>
              <ScriptToolAccessEditor
                value={items}
                onChange={(next) => {
                  onChange(item.field, next)
                  issue.onChange()
                  rowIssues.forEach((rowIssue) => rowIssue.onChange())
                }}
                toolkits={toolkits}
                settings={projectSettings}
                project={project}
                toolFilter={props.tool_filter}
                showNewIntegrationPopup={showNewIntegrationPopup}
                isGlobal={isGlobal}
                isCreator={isCreator}
                label={props.label}
                help={props.help}
                errors={errors}
              />
            </div>
          )
        }

        return (
          <div key={item.field} ref={issue.ref as any} className="flex flex-col gap-2">
            {props.label && <div className="text-sm text-text-primary">{props.label}</div>}
            <YamlEditor
              value={{ [item.field]: values[item.field] ?? [] }}
              onChange={(next) => {
                onChange(item.field, next?.[item.field])
                issue.onChange()
              }}
              helperText={props.help}
            />
            {issue.fieldError && <p className="text-text-error text-sm">{issue.fieldError}</p>}
          </div>
        )
      })}
    </>
  )
}

export default ToolStepConfigFields
