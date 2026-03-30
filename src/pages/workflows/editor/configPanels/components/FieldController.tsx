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

import { Ref, useContext } from 'react'
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  ControllerRenderProps,
  ControllerFieldState,
} from 'react-hook-form'

import { WorkflowFieldPath, WorkflowIssue } from '@/types/entity'

import { WorkflowContext } from '../../hooks/useWorkflowContext'

interface FieldControllerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<ControllerProps<TFieldValues, TName>, 'render'> {
  render: (props: {
    field: ControllerRenderProps<TFieldValues, TName> & { markIssueDirty: () => void }
    fieldState: ControllerFieldState
  }) => React.ReactElement
  issuePathPrefix?: WorkflowFieldPath
  configPath?: WorkflowFieldPath | WorkflowFieldPath[]
  mcpName?: string
}

function FieldController<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  render,
  name,
  issuePathPrefix,
  configPath,
  mcpName,
  ...controllerProps
}: FieldControllerProps<TFieldValues, TName>) {
  const workflowContext = useContext(WorkflowContext)

  if (!workflowContext) {
    return (
      <Controller
        name={name}
        {...controllerProps}
        render={({ field, fieldState }) =>
          render({ field: { ...field, markIssueDirty: () => {} }, fieldState })
        }
      />
    )
  }

  const { getIssueField, getMcpIssue, markIssueDirty } = workflowContext

  const constructIssuePath = (path: WorkflowFieldPath): WorkflowFieldPath => {
    return issuePathPrefix ? `${issuePathPrefix}.${path}` : path
  }

  const configPaths = Array.isArray(configPath) ? configPath : [configPath ?? name]

  let issueField: {
    ref: Ref<HTMLInputElement>
    fieldError?: string
    issue?: WorkflowIssue
    onChange: () => void
  }

  let foundIssue = false
  for (const path of configPaths) {
    const finalIssuePath = constructIssuePath(path)

    if (mcpName) {
      const issueResult = getMcpIssue({ mcpName, path: finalIssuePath })
      if (issueResult && (issueResult.fieldError || issueResult.issue)) {
        issueField = {
          ref: () => {},
          fieldError: issueResult.fieldError,
          issue: issueResult.issue,
          onChange: issueResult.onChange,
        }
        foundIssue = true
        break
      }
    } else {
      const result = getIssueField(finalIssuePath)
      if (result.fieldError || result.issue) {
        issueField = result
        foundIssue = true
        break
      }
    }
  }

  if (!foundIssue) {
    issueField = { onChange: () => {}, ref: () => {}, fieldError: '' }
  }

  return (
    <Controller
      name={name}
      {...controllerProps}
      render={({ field, fieldState }) => {
        const originalOnChange = field.onChange
        const wrappedOnChange: typeof originalOnChange = (...args) => {
          if (mcpName && issueField) issueField.onChange()
          else if (issueField.issue) markIssueDirty(issueField.issue)
          return originalOnChange(...args)
        }

        const enhancedField = {
          ...field,
          onChange: wrappedOnChange,
          markIssueDirty: () => {
            if (mcpName && issueField) issueField.onChange()
            else if (issueField.issue) markIssueDirty(issueField.issue)
          },
          ref: issueField.ref,
        } as ControllerRenderProps<TFieldValues, TName> & { markIssueDirty: () => void }

        const enhancedFieldState = {
          ...fieldState,
          error:
            fieldState.error ||
            (issueField.fieldError ? { type: 'issue', message: issueField.fieldError } : undefined),
        }

        return render({
          field: enhancedField,
          fieldState: enhancedFieldState,
        })
      }}
    />
  )
}

export default FieldController
