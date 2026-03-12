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
import { describe, it, expect, vi } from 'vitest'

import MCPServerEnvVars from '../MCPServerEnvVars'

describe('MCPServerEnvVars', () => {
  const mockEnvVars = [
    {
      name: 'API_KEY',
      description: 'Your API key',
      required: true,
    },
    {
      name: 'BASE_URL',
      description: 'Base URL for the service',
      required: false,
    },
  ]

  const mockValues = {
    API_KEY: 'test-key-123',
    BASE_URL: 'https://example.com',
  }

  it('renders environment variables', () => {
    const onChange = vi.fn()

    render(<MCPServerEnvVars envVars={mockEnvVars} values={mockValues} onChange={onChange} />)

    expect(screen.getByText('Settings:')).toBeInTheDocument()
    expect(screen.getByText('API_KEY')).toBeInTheDocument()
    expect(screen.getByText('BASE_URL')).toBeInTheDocument()
  })

  it('shows validation errors', () => {
    const onChange = vi.fn()
    const errors = {
      API_KEY: 'API key is required',
    }

    render(
      <MCPServerEnvVars
        envVars={mockEnvVars}
        values={mockValues}
        onChange={onChange}
        errors={errors}
      />
    )

    expect(screen.getByText('API key is required')).toBeInTheDocument()
  })

  it('returns null when no variables', () => {
    const onChange = vi.fn()

    const { container } = render(<MCPServerEnvVars envVars={[]} values={{}} onChange={onChange} />)

    expect(container.firstChild).toBeNull()
  })

  it('displays placeholders correctly', () => {
    const onChange = vi.fn()

    render(<MCPServerEnvVars envVars={mockEnvVars} values={{}} onChange={onChange} />)

    const inputs = screen.getAllByRole('textbox')
    expect(inputs[0]).toHaveAttribute('placeholder', 'Your API key')
    expect(inputs[1]).toHaveAttribute('placeholder', 'Base URL for the service')
  })
})
