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

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/TextDiffView/TextDiffView', () => ({
  default: ({ oldText, newText }: { oldText: string; newText: string }) => (
    <div data-testid="text-diff">
      <span data-testid="old-text">{oldText}</span>
      <span data-testid="new-text">{newText}</span>
    </div>
  ),
}))

describe('VersionHistoryDiffView', () => {
  it('maps current baseline and history text into TextDiffView', async () => {
    const { default: VersionHistoryDiffView } = await import(
      '@/components/form/VersionedField/VersionHistoryDiffView'
    )

    render(
      <VersionHistoryDiffView
        historyText="history-yaml"
        currentText="current-yaml"
        previousHistoryText="previous-yaml"
        title="[02] - date - author"
      />
    )

    expect(screen.getByText('Current Version')).toBeInTheDocument()
    expect(screen.getByText('Previous Version')).toBeInTheDocument()
    expect(screen.getByText('[02] - date - author')).toBeInTheDocument()
    expect(screen.getByTestId('old-text')).toHaveTextContent('current-yaml')
    expect(screen.getByTestId('new-text')).toHaveTextContent('history-yaml')
  })

  it('switches to previous baseline when available', async () => {
    const { default: VersionHistoryDiffView } = await import(
      '@/components/form/VersionedField/VersionHistoryDiffView'
    )

    render(
      <VersionHistoryDiffView
        historyText="history-yaml"
        currentText="current-yaml"
        previousHistoryText="previous-yaml"
        title="title"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Previous Version' }))
    expect(screen.getByTestId('old-text')).toHaveTextContent('previous-yaml')
  })

  it('disables previous baseline when no previous text exists', async () => {
    const { default: VersionHistoryDiffView } = await import(
      '@/components/form/VersionedField/VersionHistoryDiffView'
    )

    render(
      <VersionHistoryDiffView historyText="history-yaml" currentText="current-yaml" title="title" />
    )

    expect(screen.getByRole('button', { name: 'Previous Version' })).toBeDisabled()
  })
})

describe('VersionedFieldHistoryTab canRestore', () => {
  it('hides Restore when canRestore is false', async () => {
    const { default: VersionedFieldHistoryTab } = await import(
      '@/components/form/VersionedField/VersionedFieldHistoryTab'
    )

    render(
      <VersionedFieldHistoryTab
        options={[{ label: '[01] - d - a', value: 'v1' }]}
        selectedOption="v1"
        emptyPlaceholder="empty"
        onRestore={vi.fn()}
        onOptionChange={vi.fn()}
        canRestore={false}
      >
        <div>diff</div>
      </VersionedFieldHistoryTab>
    )

    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument()
  })

  it('shows Restore by default for Assistant compatibility', async () => {
    const { default: VersionedFieldHistoryTab } = await import(
      '@/components/form/VersionedField/VersionedFieldHistoryTab'
    )

    render(
      <VersionedFieldHistoryTab
        options={[{ label: '[01] - d - a', value: 'v1' }]}
        selectedOption="v1"
        emptyPlaceholder="empty"
        onRestore={vi.fn()}
        onOptionChange={vi.fn()}
      >
        <div>diff</div>
      </VersionedFieldHistoryTab>
    )

    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
  })

  it('hides the YAML line-color hint when banner is null', async () => {
    const { default: VersionedFieldHistoryTab } = await import(
      '@/components/form/VersionedField/VersionedFieldHistoryTab'
    )

    render(
      <VersionedFieldHistoryTab
        options={[{ label: '[01] - d - a', value: 'v1' }]}
        selectedOption="v1"
        emptyPlaceholder="empty"
        onRestore={vi.fn()}
        onOptionChange={vi.fn()}
        banner={null}
      >
        <div>diff</div>
      </VersionedFieldHistoryTab>
    )

    expect(screen.queryByText(/Review the changes below/)).not.toBeInTheDocument()
    expect(screen.getByTestId('version-history-toolbar')).toContainElement(
      screen.getByRole('button', { name: 'Restore' })
    )
  })

  it('shows the YAML line-color hint by default', async () => {
    const { default: VersionedFieldHistoryTab } = await import(
      '@/components/form/VersionedField/VersionedFieldHistoryTab'
    )

    render(
      <VersionedFieldHistoryTab
        options={[{ label: '[01] - d - a', value: 'v1' }]}
        selectedOption="v1"
        emptyPlaceholder="empty"
        onRestore={vi.fn()}
        onOptionChange={vi.fn()}
      >
        <div>diff</div>
      </VersionedFieldHistoryTab>
    )

    expect(screen.getByText(/Review the changes below/)).toBeInTheDocument()
    expect(screen.getByText('red')).toBeInTheDocument()
    expect(screen.getByText('green')).toBeInTheDocument()
    expect(screen.queryByText('yellow')).not.toBeInTheDocument()
    expect(screen.queryByText(/were modified/)).not.toBeInTheDocument()

    const toolbar = screen.getByTestId('version-history-toolbar')
    expect(toolbar).toContainElement(screen.getByText(/Review the changes below/))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Restore' }))
    expect(toolbar.parentElement).toHaveClass('gap-4')
  })

  it('renders a custom banner instead of the YAML hint', async () => {
    const { default: VersionedFieldHistoryTab } = await import(
      '@/components/form/VersionedField/VersionedFieldHistoryTab'
    )

    render(
      <VersionedFieldHistoryTab
        options={[{ label: '[01] - d - a', value: 'v1' }]}
        selectedOption="v1"
        emptyPlaceholder="empty"
        onRestore={vi.fn()}
        onOptionChange={vi.fn()}
        banner={<div data-testid="banner-slot">legend</div>}
      >
        <div>diff</div>
      </VersionedFieldHistoryTab>
    )

    expect(screen.getByTestId('banner-slot')).toBeInTheDocument()
    expect(screen.queryByText(/Review the changes below/)).not.toBeInTheDocument()

    const toolbar = screen.getByTestId('version-history-toolbar')
    expect(toolbar).toContainElement(screen.getByTestId('banner-slot'))
    expect(toolbar).toContainElement(screen.getByRole('button', { name: 'Restore' }))
  })

  const renderHistoryTab = async (onRestore = vi.fn()) => {
    const { default: VersionedFieldHistoryTab } = await import(
      '@/components/form/VersionedField/VersionedFieldHistoryTab'
    )

    render(
      <VersionedFieldHistoryTab
        options={[{ label: '[01] - d - a', value: 'v1' }]}
        selectedOption="v1"
        emptyPlaceholder="empty"
        onRestore={onRestore}
        onOptionChange={vi.fn()}
      >
        <div>diff</div>
      </VersionedFieldHistoryTab>
    )

    return onRestore
  }

  it('does not restore when confirmation is cancelled', async () => {
    const onRestore = await renderHistoryTab()

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    const dialog = await screen.findByRole('dialog', { name: 'Restore this version?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(onRestore).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Restore this version?' })
      ).not.toBeInTheDocument()
    })
  })

  it('restores after confirmation is accepted', async () => {
    const onRestore = await renderHistoryTab()

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    fireEvent.click(
      within(await screen.findByRole('dialog', { name: 'Restore this version?' })).getByRole(
        'button',
        { name: 'Restore' }
      )
    )

    expect(onRestore).toHaveBeenCalledTimes(1)
  })
})
