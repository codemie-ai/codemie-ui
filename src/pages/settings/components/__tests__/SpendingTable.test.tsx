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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import SpendingTable from '../SpendingTable'

afterEach(cleanup)

const COLUMNS = [
  { id: 'category', label: 'Category' },
  { id: 'spent', label: 'Spent', format: 'currency' },
]

describe('SpendingTable', () => {
  it('renders every category spend with exactly two decimals', () => {
    render(
      <SpendingTable
        columns={COLUMNS}
        rows={[
          { category: 'platform', spent: 12.3456 },
          { category: 'cli', spent: 0.0067 },
          { category: 'premium_models', spent: 0.0017 },
        ]}
      />
    )

    expect(screen.getByText('$12.35')).toBeInTheDocument()
    expect(screen.getByText('$0.01')).toBeInTheDocument()
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })

  it('renders an absent cell as a dash, never $0.00', () => {
    render(<SpendingTable columns={COLUMNS} rows={[{ category: 'platform', spent: null }]} />)

    expect(screen.getByText('-')).toBeInTheDocument()
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument()
  })
})
