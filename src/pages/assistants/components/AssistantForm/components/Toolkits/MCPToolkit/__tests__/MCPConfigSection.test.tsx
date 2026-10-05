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

import { MCPServerConfig } from '@/types/entity/mcp'

import { MCPFormValues } from '../formTypes'
import MCPConfigSection from '../MCPConfigSection'

vi.mock('@/constants/assistants', () => ({
  MCP_CONFIG_SAMPLE: 'Sample MCP configuration',
}))

const defaultValues: MCPFormValues = {
  name: '',
  description: '',
  tokensSizeLimit: null,
  connectUrl: '',
  configJson: '{}',
  command: '',
  arguments: '',
  useCustomConfig: false,
}

const Wrapper = ({
  configHasEnv = false,
  hasCatalogReference,
  isCatalogRef,
  useCustomConfig,
  configJson,
  catalogConfig,
}: {
  configHasEnv?: boolean
  hasCatalogReference?: boolean
  isCatalogRef?: boolean
  useCustomConfig?: boolean
  configJson?: string
  catalogConfig?: MCPServerConfig
}) => {
  const { control, setValue } = useForm<MCPFormValues>({
    defaultValues: {
      ...defaultValues,
      useCustomConfig: useCustomConfig ?? defaultValues.useCustomConfig,
      configJson: configJson ?? defaultValues.configJson,
    },
  })
  return (
    <MCPConfigSection
      control={control}
      configHasEnv={configHasEnv}
      setValue={setValue}
      hasCatalogReference={hasCatalogReference}
      isCatalogRef={isCatalogRef}
      catalogConfig={catalogConfig}
    />
  )
}

describe('MCPConfigSection', () => {
  it('renders MCP Configuration label', () => {
    render(<Wrapper />)
    expect(screen.getByText('MCP Configuration')).toBeInTheDocument()
  })

  it('renders JSON configuration textarea', () => {
    render(<Wrapper />)
    expect(screen.getByLabelText('Configuration (JSON format)')).toBeInTheDocument()
  })

  it('does not render Form/JSON tab selector', () => {
    render(<Wrapper />)
    expect(screen.queryByText('Form')).not.toBeInTheDocument()
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
  })

  it('always shows the sensitive env warning regardless of configHasEnv', () => {
    render(<Wrapper configHasEnv={false} />)
    expect(screen.getByText(/sensitive.*configuration.*must be provided/i)).toBeInTheDocument()
  })

  it('shows the sensitive env warning when configHasEnv is true', () => {
    render(<Wrapper configHasEnv={true} />)
    expect(screen.getByText(/sensitive.*configuration.*must be provided/i)).toBeInTheDocument()
  })

  it('shows hint about required command or url field', () => {
    render(<Wrapper />)
    expect(screen.getByText(/Must include at least.*command.*or.*url.*field/i)).toBeInTheDocument()
  })

  it('hides the Global/Custom toggle and forces read-only when isCatalogRef is true', () => {
    render(<Wrapper hasCatalogReference isCatalogRef useCustomConfig />)
    expect(screen.queryByText('Custom')).not.toBeInTheDocument()
    // getByLabelText's regex would also match the label's nested TooltipButton (a labelable
    // <button>), unrelated to this task — scope to the textbox role to target the field itself.
    expect(screen.getByRole('textbox', { name: /Configuration \(JSON format\)/i })).toBeDisabled()
  })

  it('displays the catalog config, not a stale custom config, when isCatalogRef is true', () => {
    render(
      <Wrapper
        hasCatalogReference
        isCatalogRef
        useCustomConfig
        configJson={'{"command":"stale-custom-command"}'}
        catalogConfig={{ command: 'catalog-command' }}
      />
    )
    const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', {
      name: /Configuration \(JSON format\)/i,
    })
    expect(textarea.value).toContain('catalog-command')
    expect(textarea.value).not.toContain('stale-custom-command')
  })
})
