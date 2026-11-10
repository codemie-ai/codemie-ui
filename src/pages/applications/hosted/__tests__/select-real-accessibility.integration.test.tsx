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

import { render, screen } from '@testing-library/react'
import { PrimeReactProvider } from 'primereact/api'
import { expect, it, vi } from 'vitest'

// Deep import intentionally bypasses the temp suite's simple shared Select stub.
import Select from '@/components/form/Select/Select'

import type React from 'react'

vi.mock('@/assets/icons/chevron-down.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/components/TooltipButton', () => ({ default: () => null }))
vi.mock('@/hooks/useIsTruncated', () => ({ useIsTruncated: () => false }))
const renderSelect = (element: React.ReactElement) =>
  render(<PrimeReactProvider value={{ unstyled: true }}>{element}</PrimeReactProvider>)

it('names the real PrimeReact combobox and associates its visible label without moving the outer id', () => {
  renderSelect(
    <Select
      id="catalog-sort"
      label="Sort"
      value="updated_desc"
      options={[{ label: 'Recently updated', value: 'updated_desc' }]}
    />
  )
  const combobox = screen.getByLabelText('Sort', { selector: 'input' })
  expect(combobox).toHaveAccessibleName('Sort')
  expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
  expect(combobox).toHaveAttribute('id', 'catalog-sort-input')
  expect(document.getElementById('catalog-sort')).toContainElement(combobox)
})

it('retains the real field error association for the named combobox', () => {
  renderSelect(
    <Select
      id="catalog-sort"
      label="Sort"
      value="updated_desc"
      error="Choose a sort"
      options={[{ label: 'Recently updated', value: 'updated_desc' }]}
    />
  )
  const combobox = screen.getByLabelText('Sort', { selector: 'input' })
  const alert = screen.getByRole('alert')
  expect(combobox).toHaveAttribute('aria-invalid', 'true')
  expect(combobox).toHaveAttribute('aria-describedby', alert.id)
})

it('names a labeled combobox when the caller did not supply an id', () => {
  renderSelect(
    <Select
      label="Sort"
      value="updated_desc"
      options={[{ label: 'Recently updated', value: 'updated_desc' }]}
    />
  )
  expect(screen.getByLabelText('Sort', { selector: 'input' })).toHaveAccessibleName('Sort')
})
