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
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UaWhoPays } from '@/types/usageAttribution'

import { UA_CATEGORY_FALLBACK_COLORS } from '../constants'
import { WhoPaysBars } from '../widgets/Charts'

type Dataset = { label: string; data: number[]; backgroundColor: string }

// The bar chart draws on a canvas: the stub lists the datasets it is given.
vi.mock('react-chartjs-2', () => ({
  Bar: ({ data }: { data: { datasets: Dataset[] } }) => (
    <ul data-testid="bar-datasets">
      {data.datasets.map((d) => (
        <li key={d.label} data-color={d.backgroundColor}>{`${d.label}=${d.data.join(',')}`}</li>
      ))}
    </ul>
  ),
  Pie: () => <canvas />,
  Doughnut: () => <canvas />,
}))

vi.mock('@/utils/tailwindColors', () => ({
  getTailwindColor: (_token: string, fallback: string) => fallback,
}))

const WEB: UaWhoPays = { charged: 0, shared: 0, personal: 0, unclassified: 752.63 }
const CLI: UaWhoPays = { charged: 0.87, shared: 41.85, personal: 12.11, unclassified: 966.09 }

const bars = () => screen.getByTestId('bar-datasets')

describe('WhoPaysBars', () => {
  afterEach(cleanup)

  it('draws Unclassified as a fourth stacked bar, after the three payers', () => {
    render(<WhoPaysBars web={WEB} cli={CLI} />)
    expect([...bars().children].map((li) => li.textContent)).toEqual([
      'Charged back=0,0.87',
      'Shared project, no budget=0,41.85',
      'Personal project=0,12.11',
      'Unclassified=752.63,966.09',
    ])
  })

  it('colours Unclassified grey, as the other widgets colour unclassified spend', () => {
    render(<WhoPaysBars web={WEB} cli={CLI} />)
    const unclassified = [...bars().children].find((li) =>
      li.textContent?.startsWith('Unclassified')
    )
    expect(unclassified?.getAttribute('data-color')).toBe(UA_CATEGORY_FALLBACK_COLORS.unclassified)
  })

  it('lists Unclassified in the legend with the Web Platform and CLI amount together', () => {
    render(<WhoPaysBars web={WEB} cli={CLI} />)
    expect(screen.getByText('Unclassified').nextElementSibling?.textContent).toBe('$1.7K')
  })

  it('reads a missing figure as nothing rather than breaking the bars', () => {
    const none: UaWhoPays = { charged: null, shared: null, personal: null, unclassified: null }
    render(<WhoPaysBars web={none} cli={{ charged: 1, shared: 2, personal: 3 }} />)
    expect(screen.getByText('Unclassified=0,0')).toBeTruthy()
  })
})
