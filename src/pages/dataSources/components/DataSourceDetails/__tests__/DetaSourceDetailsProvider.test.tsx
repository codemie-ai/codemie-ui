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

import { MASKED_VALUE } from '@/constants/settings'

import DataSourceDetailsProvider from '../DetaSourceDetailsProvider'

const renderProvider = (providerFields: any) =>
  render(
    <DataSourceDetailsProvider
      providerFields={providerFields}
      titleStyles=""
      propertyLabelStyles=""
      propertyTagStyles=""
    />
  )

describe('DataSourceDetailsProvider', () => {
  it('renders non-string param values without crashing', () => {
    renderProvider({
      base_params: { port: 5432, verify_ssl: true, timeout: null },
      create_params: { options: { pool: 5 } },
    })

    expect(screen.getByText('5432')).toBeInTheDocument()
    expect(screen.getByText('true')).toBeInTheDocument()
    expect(screen.getByText('{"pool":5}')).toBeInTheDocument()
  })

  it('renders arrays containing non-string values', () => {
    renderProvider({ base_params: { ports: [5432, 5433] }, create_params: {} })

    expect(screen.getByText('5432')).toBeInTheDocument()
    expect(screen.getByText('5433')).toBeInTheDocument()
  })

  it('masks padded base64 encoded values and keeps plain ones', () => {
    // btoa('token') === 'dG9rZW4=' — the mask heuristic only fires on '='-padded values
    renderProvider({
      base_params: { secret: btoa('token'), host: 'db.example.com' },
      create_params: {},
    })

    expect(screen.getByText(MASKED_VALUE)).toBeInTheDocument()
    expect(screen.getByText('db.example.com')).toBeInTheDocument()
  })

  it('keeps a non-base64 value that merely ends with "="', () => {
    renderProvider({ base_params: { query: 'a=' }, create_params: {} })

    expect(screen.getByText('a=')).toBeInTheDocument()
  })

  it('renders when provider fields are missing', () => {
    renderProvider(undefined)

    expect(screen.getByText('Details')).toBeInTheDocument()
  })
})
