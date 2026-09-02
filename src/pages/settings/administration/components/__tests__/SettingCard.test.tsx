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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingDeclaration } from '@/types/entity/customerConfiguration'

import SettingCard from '../SettingCard'

const declaration = (value: Record<string, string>): SettingDeclaration => ({
  component_id: 'chatDisclaimer',
  label: 'Chat disclaimer',
  description: null,
  overridden: false,
  value,
  fields: [
    {
      name: 'text',
      type: 'textarea',
      label: 'Disclaimer text',
      description: null,
      required: false,
      max_length: 1000,
      pattern: null,
      pattern_message: null,
      markup: 'markdown',
    },
  ],
})

describe('SettingCard', () => {
  afterEach(cleanup)

  it('keeps the admin edit when an unrelated refetch hands back an equal value', () => {
    const { rerender } = render(
      <SettingCard setting={declaration({ text: 'stored' })} onSave={vi.fn()} onReset={vi.fn()} />
    )

    const textarea = screen.getByLabelText('Disclaimer text')
    fireEvent.change(textarea, { target: { value: 'my unsaved edit' } })

    // saving another card refetches the list, producing a new object with identical content
    rerender(
      <SettingCard setting={declaration({ text: 'stored' })} onSave={vi.fn()} onReset={vi.fn()} />
    )

    expect(screen.getByLabelText('Disclaimer text')).toHaveValue('my unsaved edit')
  })

  it('adopts the stored value when it actually changed', () => {
    const { rerender } = render(
      <SettingCard setting={declaration({ text: 'stored' })} onSave={vi.fn()} onReset={vi.fn()} />
    )

    fireEvent.change(screen.getByLabelText('Disclaimer text'), {
      target: { value: 'my unsaved edit' },
    })
    rerender(
      <SettingCard
        setting={declaration({ text: 'saved by someone else' })}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Disclaimer text')).toHaveValue('saved by someone else')
  })

  it('shows the admin their own saved value after a save', () => {
    const { rerender } = render(
      <SettingCard setting={declaration({ text: 'stored' })} onSave={vi.fn()} onReset={vi.fn()} />
    )

    fireEvent.change(screen.getByLabelText('Disclaimer text'), { target: { value: 'newly typed' } })
    // the save round-trips and the refetch returns exactly what was typed
    rerender(
      <SettingCard
        setting={declaration({ text: 'newly typed' })}
        onSave={vi.fn()}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Disclaimer text')).toHaveValue('newly typed')
  })
})
