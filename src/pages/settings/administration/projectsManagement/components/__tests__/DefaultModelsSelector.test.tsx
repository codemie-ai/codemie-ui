// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'

import DefaultModelsSelector from '../DefaultModelsSelector'

const mockTruncation = { isTruncated: false }

vi.mock('@/hooks/useIsTruncated', () => ({
  useIsTruncated: () => mockTruncation.isTruncated,
}))

beforeEach(() => {
  mockTruncation.isTruncated = false
})

const models: ModelOption[] = [
  { label: 'GPT-4o', value: 'gpt-4o', isDefault: true, isPremium: false },
  {
    label: 'Bedrock Claude Opus 4.5',
    value: 'bedrock-claude-opus-4-5',
    isDefault: false,
    isPremium: true,
  },
]

const renderSelector = () =>
  render(<DefaultModelsSelector models={models} defaultModel="gpt-4o" onDefaultChange={vi.fn()} />)

describe('DefaultModelsSelector — premium row label', () => {
  it('shows a Premium meta-line only on the premium option row', () => {
    const { container } = renderSelector()
    fireEvent.click(container.querySelector('#project-default-model')!)

    const metas = screen.getAllByTestId('default-model-option-meta')
    expect(metas).toHaveLength(1)
    expect(metas[0]).toHaveTextContent('Premium')
  })

  it('does not render a Premium label for a non-premium option row', () => {
    const { container } = renderSelector()
    fireEvent.click(container.querySelector('.p-dropdown')!)

    const rows = screen.getAllByTestId('default-model-option-row')
    const gptRow = rows.find((row) => row.textContent?.includes('GPT-4o'))
    expect(gptRow?.querySelector('[data-testid="default-model-option-meta"]')).toBeNull()
  })

  it('gives every option row the same padding the default Select row used, since Select forces p-0 on the li wrapper', () => {
    const { container } = renderSelector()
    fireEvent.click(container.querySelector('.p-dropdown')!)

    const rows = screen.getAllByTestId('default-model-option-row')
    rows.forEach((row) => {
      expect(row.className).toContain('px-2.5')
      expect(row.className).toContain('py-1.5')
    })
  })

  it('shows the full label in a tooltip when the option row label is truncated', () => {
    mockTruncation.isTruncated = true
    const { container } = renderSelector()
    fireEvent.click(container.querySelector('.p-dropdown')!)

    const rows = screen.getAllByTestId('default-model-option-row')
    const gptRow = rows.find((row) => row.textContent?.includes('GPT-4o'))
    expect(gptRow).toHaveAttribute('data-tooltip-id', 'react-tooltip')
    expect(gptRow).toHaveAttribute('data-tooltip-content', 'GPT-4o')
  })

  it('does not set tooltip content when the option row label is not truncated', () => {
    mockTruncation.isTruncated = false
    const { container } = renderSelector()
    fireEvent.click(container.querySelector('.p-dropdown')!)

    const rows = screen.getAllByTestId('default-model-option-row')
    const gptRow = rows.find((row) => row.textContent?.includes('GPT-4o'))
    expect(gptRow).not.toHaveAttribute('data-tooltip-id')
  })
})

const renderWithRouter = (ui: Parameters<typeof render>[0]) =>
  render(<MemoryRouter>{ui}</MemoryRouter>)

describe('DefaultModelsSelector — selected-value premium highlight', () => {
  it('shows a Premium note under the Project default model field when it is premium', () => {
    renderWithRouter(
      <DefaultModelsSelector
        models={models}
        defaultModel="bedrock-claude-opus-4-5"
        onDefaultChange={vi.fn()}
      />
    )

    expect(screen.getByTestId('project-default-model-premium-note')).toHaveTextContent(
      'Premium model'
    )
  })

  it('shows no premium note when the selected model is non-premium', () => {
    renderWithRouter(
      <DefaultModelsSelector models={models} defaultModel="gpt-4o" onDefaultChange={vi.fn()} />
    )

    expect(screen.queryByTestId('project-default-model-premium-note')).not.toBeInTheDocument()
  })
})
