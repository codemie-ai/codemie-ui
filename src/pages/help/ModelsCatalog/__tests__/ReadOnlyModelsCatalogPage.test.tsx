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

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ModelOption } from '@/types/entity/configuration'

import ReadOnlyModelsCatalogPage from '../ReadOnlyModelsCatalogPage'

const { store } = vi.hoisted(() => ({
  store: { llmCatalogModels: [] as ModelOption[], llmCatalogRouters: [], getLLMCatalog: vi.fn() },
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: store }))

const defaultCell = (label: string) =>
  within(screen.getByText(label).closest('tr')!).getAllByRole('cell')[4]

beforeEach(() => {
  store.llmCatalogModels = [
    {
      value: 'new-default',
      label: 'New Default',
      isDefault: true,
      defaultForCategories: ['global', 'code'],
    },
    { value: 'GPT-4.1 2025-04-14', label: 'Legacy Global', isDefault: false },
    { value: 'GPT-5 2025-08-07', label: 'Legacy CLI', isDefault: false, defaultForCategories: [] },
  ]
})

describe('ReadOnlyModelsCatalogPage default categories', () => {
  it('uses API categories and does not infer defaults from legacy model names', () => {
    render(<ReadOnlyModelsCatalogPage />)
    expect(defaultCell('New Default')).toHaveTextContent('global, code')
    expect(defaultCell('Legacy Global')).toHaveTextContent('—')
    expect(defaultCell('Legacy CLI')).toHaveTextContent('—')
  })

  it('moves the displayed category when refreshed API data changes the default', () => {
    const { rerender } = render(<ReadOnlyModelsCatalogPage />)
    store.llmCatalogModels = store.llmCatalogModels.map((model, index) => ({
      ...model,
      isDefault: index === 1,
      defaultForCategories: index === 1 ? ['global'] : [],
    }))
    rerender(<ReadOnlyModelsCatalogPage />)
    expect(defaultCell('New Default')).toHaveTextContent('—')
    expect(defaultCell('Legacy Global')).toHaveTextContent('global')
  })
})

describe('ReadOnlyModelsCatalogPage model metadata', () => {
  it('flags deprecated models while leaving enabled and legacy responses unflagged', () => {
    store.llmCatalogModels[0].status = 'deprecated'
    store.llmCatalogModels[1].status = 'enabled'
    render(<ReadOnlyModelsCatalogPage />)
    expect(
      within(screen.getByText('New Default').closest('tr')!).getByRole('status', {
        name: 'Deprecated',
      })
    ).toBeInTheDocument()
    expect(
      within(screen.getByText('Legacy Global').closest('tr')!).queryByRole('status', {
        name: 'Deprecated',
      })
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByText('Legacy CLI').closest('tr')!).queryByRole('status', {
        name: 'Deprecated',
      })
    ).not.toBeInTheDocument()
  })

  it('keeps premium and deprecated badges together and updates on refreshed statuses', () => {
    store.llmCatalogModels[0] = {
      ...store.llmCatalogModels[0],
      status: 'deprecated',
      isPremium: true,
    }
    const { rerender } = render(<ReadOnlyModelsCatalogPage />)
    const model = within(screen.getByText('New Default').closest('tr')!)
    expect(model.getByRole('status', { name: 'Premium' })).toBeInTheDocument()
    expect(model.getByRole('status', { name: 'Deprecated' })).toBeInTheDocument()
    store.llmCatalogModels = store.llmCatalogModels.map((model, index) =>
      index === 0 ? { ...model, status: 'enabled' } : model
    )
    rerender(<ReadOnlyModelsCatalogPage />)
    expect(model.queryByRole('status', { name: 'Deprecated' })).not.toBeInTheDocument()
    expect(model.getByRole('status', { name: 'Premium' })).toBeInTheDocument()
  })

  it('uses the shared provider labels and per-million cost formatting with fallbacks', () => {
    store.llmCatalogModels[0] = {
      ...store.llmCatalogModels[0],
      provider: 'azure_openai',
      cost: { input: 0.0000015, output: 0.000003 },
    }
    store.llmCatalogModels[1] = {
      ...store.llmCatalogModels[1],
      provider: 'custom_provider',
      cost: { input: 0, output: 0 },
    }
    render(<ReadOnlyModelsCatalogPage />)
    const first = within(screen.getByText('New Default').closest('tr')!)
    const second = within(screen.getByText('Legacy Global').closest('tr')!)
    expect(first.getByRole('cell', { name: 'Azure OpenAI' })).toBeInTheDocument()
    expect(first.getByText('$1.50 / $3.00')).toBeInTheDocument()
    expect(second.getByRole('cell', { name: 'custom_provider' })).toBeInTheDocument()
    expect(second.getByText('$0.00 / $0.00')).toBeInTheDocument()
    expect(
      within(screen.getByText('Legacy CLI').closest('tr')!).getAllByRole('cell')[3]
    ).toHaveTextContent('—')
  })

  it('keeps deprecated flags attached to the matching rows when searching', () => {
    store.llmCatalogModels[1].status = 'deprecated'
    render(<ReadOnlyModelsCatalogPage />)
    fireEvent.change(screen.getByPlaceholderText('Search models'), {
      target: { value: 'Legacy Global' },
    })
    expect(screen.getByRole('status', { name: 'Deprecated' })).toBeInTheDocument()
    expect(screen.queryByText('New Default')).not.toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Search models'), {
      target: { value: 'New Default' },
    })
    expect(screen.queryByRole('status', { name: 'Deprecated' })).not.toBeInTheDocument()
  })
})
