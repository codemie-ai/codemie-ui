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
import { describe, it, expect } from 'vitest'

import { HedgingConfig } from '@/types/entity/assistant'

import RequestHedgingDetails from '../RequestHedgingDetails'

const providerConfig: HedgingConfig = {
  provider_tool: {
    provider_name: 'acme',
    toolkit_name: 'search',
    tool_name: 'web_search',
  },
  timeout_ms: 3000,
}

const internalConfig: HedgingConfig = {
  tool: { name: 'internal_search' },
  timeout_ms: 1500,
}

const noToolConfig: HedgingConfig = {
  timeout_ms: 500,
}

describe('RequestHedgingDetails', () => {
  it('shows Enabled: Yes', () => {
    render(<RequestHedgingDetails hedgingConfig={providerConfig} />)
    expect(screen.getByText('Enabled:')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })

  it('shows provider tool name for provider mode', () => {
    render(<RequestHedgingDetails hedgingConfig={providerConfig} />)
    expect(screen.getByText('Tool:')).toBeInTheDocument()
    expect(screen.getByText('web_search')).toBeInTheDocument()
  })

  it('shows internal tool name for internal mode', () => {
    render(<RequestHedgingDetails hedgingConfig={internalConfig} />)
    expect(screen.getByText('Tool:')).toBeInTheDocument()
    expect(screen.getByText('internal_search')).toBeInTheDocument()
  })

  it('omits Tool row when no tool is configured', () => {
    render(<RequestHedgingDetails hedgingConfig={noToolConfig} />)
    expect(screen.getByText('Enabled:')).toBeInTheDocument()
    expect(screen.queryByText('Tool:')).not.toBeInTheDocument()
  })
})
