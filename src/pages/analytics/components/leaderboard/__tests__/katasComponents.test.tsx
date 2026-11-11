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

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'

import DimensionDetailModal from '../DimensionDetailModal'
import FrameworkDimensionCard from '../FrameworkDimensionCard'
import LeaderboardDimensionCard from '../LeaderboardDimensionCard'

vi.mock('@/components/Popup', () => ({
  default: ({ children }: any) => <div>{children}</div>,
}))

const setKatas = (enabled: boolean) => {
  appInfoStore.configs = (
    enabled ? [{ id: 'features:katas', settings: { enabled: true } }] : []
  ) as any
}

const comp = (key: string, label: string, extra = {}) => ({
  key,
  label,
  weight: 0.2,
  raw_value: 1,
  normalized: 0.5,
  display_value: '1',
  ...extra,
})

const framework = (components: Record<string, any>) =>
  ({
    id: 'd6',
    label: 'D6',
    name: 'Growth',
    weight: 0.2,
    color: '#fff',
    icon: '',
    description: 'desc',
    components,
  } as any)

describe('FrameworkDimensionCard', () => {
  const dim = framework({
    learning: { label: 'Learning', weight: 1 },
    adoption: { label: 'Adoption', weight: 1 },
  })

  it('hides the learning chip when katas are off', () => {
    setKatas(false)
    render(<FrameworkDimensionCard dimension={dim} onClick={vi.fn()} />)
    expect(screen.queryByText('Learning')).not.toBeInTheDocument()
    expect(screen.getByText('Adoption')).toBeInTheDocument()
  })

  it('shows the learning chip when katas are on', () => {
    setKatas(true)
    render(<FrameworkDimensionCard dimension={dim} onClick={vi.fn()} />)
    expect(screen.getByText('Learning')).toBeInTheDocument()
  })
})

describe('DimensionDetailModal', () => {
  const dim = framework({
    learning: { label: 'Learning', weight: 0.2 },
    a: { label: 'Alpha', weight: 0.4 },
    b: { label: 'Beta', weight: 0.4 },
  })

  beforeEach(() => setKatas(false))

  it('drops the learning row but keeps the others at their unfiltered share', () => {
    render(<DimensionDetailModal dimension={dim} onHide={vi.fn()} />)
    expect(screen.queryByText('Learning')).not.toBeInTheDocument()
    expect(screen.getAllByText('Weight inside D6: 40%')).toHaveLength(2)
    expect(screen.getByText('2 scored subdimensions')).toBeInTheDocument()
  })

  it('shows all rows when on', () => {
    setKatas(true)
    render(<DimensionDetailModal dimension={dim} onHide={vi.fn()} />)
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getAllByText('Weight inside D6: 40%')).toHaveLength(2)
  })
})

describe('LeaderboardDimensionCard', () => {
  const dimOf = (components: any[]) =>
    ({ id: 'd6', name: 'Growth', label: 'Growth', score: 0.5, components } as any)

  const open = () => fireEvent.click(screen.getByRole('button'))

  it('hides the learning component when off, keeps others', () => {
    setKatas(false)
    render(
      <LeaderboardDimensionCard
        dim={dimOf([comp('learning', 'Learning'), comp('adoption', 'Adoption')])}
      />
    )
    open()
    expect(screen.queryByText('Learning')).not.toBeInTheDocument()
    expect(screen.getByText('Adoption')).toBeInTheDocument()
  })

  it('shows the learning component when on', () => {
    setKatas(true)
    render(<LeaderboardDimensionCard dim={dimOf([comp('learning', 'Learning')])} />)
    open()
    expect(screen.getByText('Learning')).toBeInTheDocument()
  })

  it('renders no list and no calc button when learning is the only component', () => {
    setKatas(false)
    render(<LeaderboardDimensionCard dim={dimOf([comp('learning', 'Learning', { calc: 'x' })])} />)
    open()
    expect(screen.queryByText('How is this calculated?')).not.toBeInTheDocument()
    expect(screen.queryByText('Learning')).not.toBeInTheDocument()
  })
})
