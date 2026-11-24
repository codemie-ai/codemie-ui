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

import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import Input from '@/components/form/Input'
import { WorkflowIssue } from '@/types/entity'

import { WorkflowContext } from '../../../hooks/useWorkflowContext'
import ContractFields from '../ContractFields'
import FieldController from '../FieldController'

const issue = (outcome: 'ERROR' | 'WARNING', path = 'input_schema'): WorkflowIssue =>
  ({
    id: `${outcome}-${path}`,
    message: `${outcome} text`,
    path,
    outcome,
    configLine: 1,
  } as WorkflowIssue)

const contextFor = (fieldIssue: WorkflowIssue, kind: 'error' | 'warning') =>
  ({
    getIssueField: () => ({
      ref: () => {},
      issue: fieldIssue,
      onChange: () => {},
      ...(kind === 'error'
        ? { fieldError: fieldIssue.message }
        : { fieldWarning: fieldIssue.message }),
    }),
    getMcpIssue: () => null,
    markIssueDirty: vi.fn(),
  } as unknown as React.ContextType<typeof WorkflowContext>)

const Probe = ({ withSelect = false }: { withSelect?: boolean }) => {
  const { control } = useForm({ defaultValues: { input_schema: '', save_validation: '' } })
  return (
    <>
      <FieldController
        name="input_schema"
        control={control}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            label="Probe"
            error={fieldState.error?.message}
            warning={fieldState.warning}
          />
        )}
      />
      {withSelect && <ContractFields control={control as never} showOutput={false} />}
    </>
  )
}

describe('FieldController severity', () => {
  it('passes a WARNING issue as fieldState.warning and not as error', () => {
    render(
      <WorkflowContext.Provider value={contextFor(issue('WARNING'), 'warning')}>
        <Probe />
      </WorkflowContext.Provider>
    )

    expect(screen.getByText('WARNING text')).toHaveClass('input-warning-message')
    expect(screen.getByRole('textbox', { name: 'Probe' })).not.toHaveAttribute(
      'aria-invalid',
      'true'
    )
  })

  it('passes an ERROR issue as fieldState.error and no warning', () => {
    render(
      <WorkflowContext.Provider value={contextFor(issue('ERROR'), 'error')}>
        <Probe />
      </WorkflowContext.Provider>
    )

    expect(screen.getByText('ERROR text')).toBeInTheDocument()
    expect(document.querySelector('.input-warning-message')).toBeNull()
  })

  it('shows a warning on the contract textarea and on the save validation select', () => {
    render(
      <WorkflowContext.Provider value={contextFor(issue('WARNING'), 'warning')}>
        <Probe withSelect />
      </WorkflowContext.Provider>
    )

    // The probe input, the Input contract textarea and the save validation Select each show it.
    expect(screen.getAllByText('WARNING text')).toHaveLength(3)
    expect(document.querySelector('#node_validation_mode_select')).not.toBeNull()
  })
})
