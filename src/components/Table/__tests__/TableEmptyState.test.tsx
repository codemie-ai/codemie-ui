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

import { ColumnDefinition, DefinitionTypes } from '@/types/table'

import Table from '../Table'

interface Row {
  id: string
  name: string
}

const columnDefinitions: ColumnDefinition[] = [
  { key: 'name', label: 'Name', type: DefinitionTypes.String },
]

const emptyMessage = () => screen.getByText('No data available')

describe('Table empty state placement', () => {
  /**
   * `sticky left-1/2 -translate-x-1/2` keeps the message centred in the
   * viewport while a wide table is scrolled sideways. It resolves against the
   * nearest scrolling ancestor — which an embedded table does not have, so the
   * message centred on the PAGE and visibly drifted outside its card, landing
   * in the gutter between two panels on the Marketplace overview.
   */
  it('does not viewport-centre the message in an embedded table', () => {
    render(<Table<Row> idPath="id" embedded items={[]} columnDefinitions={columnDefinitions} />)

    const wrapper = emptyMessage()
    expect(wrapper.className).not.toMatch(/sticky/)
    expect(wrapper.className).not.toMatch(/left-1\/2/)
  })

  it('keeps viewport-centring for a full-width scrollable table', () => {
    render(<Table<Row> idPath="id" items={[]} columnDefinitions={columnDefinitions} />)

    const wrapper = emptyMessage()
    expect(wrapper.className).toMatch(/sticky/)
    expect(wrapper.className).toMatch(/left-1\/2/)
  })
})
