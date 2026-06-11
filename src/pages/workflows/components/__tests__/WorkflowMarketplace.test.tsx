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
import { describe, expect, it } from 'vitest'

import WorkflowMarketplace from '../WorkflowMarketplace'

describe('WorkflowMarketplace', () => {
  it('renders total uses count', () => {
    render(<WorkflowMarketplace uniqueUsersCount={5} />)
    expect(screen.getByText(/5 total uses/i)).toBeInTheDocument()
  })

  it('uses singular form for 1 use', () => {
    render(<WorkflowMarketplace uniqueUsersCount={1} />)
    expect(screen.getByText(/1 total use/i)).toBeInTheDocument()
  })

  it('defaults to 0 uses', () => {
    render(<WorkflowMarketplace />)
    expect(screen.getByText(/0 total uses/i)).toBeInTheDocument()
  })
})
