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
import { describe, it, expect, vi } from 'vitest'

import MCPServerConfigStep from '../MCPToolkitForm/MCPServerConfigStep'

vi.mock('../MCPToolkitTest', () => ({ default: () => <button>Test Connection</button> }))
vi.mock('../MCPConfigSection', () => ({ default: () => <div data-testid="mcp-config-section" /> }))
vi.mock('../MCPBasicFields', () => ({
  default: ({ customSetupEnabled }: any) => (
    <div data-testid="mcp-basic-fields" data-readonly={!customSetupEnabled ? 'true' : ''} />
  ),
}))
vi.mock('../MCPEnvVarsSection', () => ({ default: () => <div data-testid="mcp-env-vars" /> }))

function Wrapper({ isCatalogRef }: { isCatalogRef?: boolean }) {
  const { control, setValue, trigger } = useForm()
  return (
    <MCPServerConfigStep
      control={control}
      isEditing={false}
      configHasEnv={false}
      setValue={setValue}
      envVarMode="new"
      settings={undefined}
      manualEnvVarValues={{}}
      envVarErrors={{}}
      settingsDefinitions={[]}
      serverConfigName="test"
      onEnvVarModeChange={vi.fn()}
      onSettingsChange={vi.fn()}
      onManualEnvVarValuesChange={vi.fn()}
      showNewIntegrationPopup={vi.fn()}
      serverConfig={{ name: 'test', description: '', enabled: true, settings: undefined } as any}
      validateManualEnvVars={() => true}
      triggerValidation={trigger as any}
      onCancel={vi.fn()}
      onNext={vi.fn()}
      isCatalogRef={isCatalogRef}
    />
  )
}

describe('MCPServerConfigStep', () => {
  it('shows MCPConfigSection and connectUrl when not a catalog ref', () => {
    render(<Wrapper />)
    expect(screen.getByTestId('mcp-config-section')).toBeInTheDocument()
    expect(screen.getByText('MCP-Connect URL (Optional)')).toBeInTheDocument()
  })

  it('hides MCPConfigSection and connectUrl when isCatalogRef', () => {
    render(<Wrapper isCatalogRef />)
    expect(screen.queryByTestId('mcp-config-section')).toBeNull()
    expect(screen.queryByText('MCP-Connect URL (Optional)')).toBeNull()
  })

  it('renders fields as read-only when isCatalogRef', () => {
    render(<Wrapper isCatalogRef />)
    const fields = screen.getByTestId('mcp-basic-fields')
    expect(fields.getAttribute('data-readonly')).toBe('true')
  })
})
