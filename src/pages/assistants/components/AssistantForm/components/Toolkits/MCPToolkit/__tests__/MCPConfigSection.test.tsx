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
}

const Wrapper = ({
  configHasEnv = false,
}: {
  configHasEnv?: boolean
}) => {
  const { control, setValue } = useForm<MCPFormValues>({ defaultValues })
  return (
    <MCPConfigSection
      control={control}
      configHasEnv={configHasEnv}
      setValue={setValue}
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

  it('shows env warning when configHasEnv is true', () => {
    render(<Wrapper configHasEnv={true} />)
    expect(
      screen.getByText(/When using the.*env.*key in the configuration/i)
    ).toBeInTheDocument()
  })

  it('does not show env warning when configHasEnv is false', () => {
    render(<Wrapper configHasEnv={false} />)
    expect(
      screen.queryByText(/When using the.*env.*key in the configuration/i)
    ).not.toBeInTheDocument()
  })

  it('shows hint about required command or url field', () => {
    render(<Wrapper />)
    expect(
      screen.getByText(/Must include at least.*command.*or.*url.*field/i)
    ).toBeInTheDocument()
  })
})
