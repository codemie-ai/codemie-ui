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

import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PREMIUM_MODEL_TOOLTIP } from '@/components/PremiumModelBadge'
import { HELP_MODELS_ROUTE } from '@/pages/help/ModelsCatalog'

import LLMSelector from '../LLMSelector'

// The premium note links to the models catalog, so every render needs the router
// context the app always provides (single `createBrowserRouter` in `main.tsx`).
const render = (ui: ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

// The closed-trigger surface: a labelled field with a premium model selected.
const renderTriggerSurface = (props: Partial<Parameters<typeof LLMSelector>[0]> = {}) =>
  render(
    <LLMSelector
      label="LLM model"
      placeholder="Assistant Default"
      value={LONG_PREMIUM_VALUE}
      onChange={vi.fn()}
      allowEmpty
      {...props}
    />
  )

const LONG_PREMIUM_VALUE = 'bedrock-claude-opus-4-5'
const LONG_PREMIUM_LABEL = 'Bedrock Claude Opus 4.5'

// The open dropdown surface: the panel showing every option row.
const openPanel = () => {
  const { container } = render(
    <LLMSelector value={LONG_PREMIUM_VALUE} onChange={vi.fn()} allowEmpty />
  )
  fireEvent.click(container.querySelector('.p-multiselect')!)
  return container
}

const { mockAppInfoStore, mockTruncation } = vi.hoisted(() => ({
  // jsdom has no layout, so the real hook can never report truncation. The row
  // composes its hover text from this flag, so the tests drive it directly.
  mockTruncation: { isTruncated: false },
  mockAppInfoStore: {
    llmModels: [
      {
        label: 'Bedrock Claude Opus 4.5',
        value: 'bedrock-claude-opus-4-5',
        isDefault: false,
        isPremium: true,
      },
      { label: 'GPT-4o', value: 'gpt-4o', isDefault: true },
    ],
    imageGenerationModels: [],
    getLLMModels: vi.fn(),
    getImageGenerationModels: vi.fn(),
  },
}))

vi.mock('valtio', () => ({
  proxy: (obj: unknown) => obj,
  useSnapshot: vi.fn(() => mockAppInfoStore),
  subscribe: vi.fn(),
}))
vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/hooks/useIsTruncated', () => ({
  useIsTruncated: () => mockTruncation.isTruncated,
}))

beforeEach(() => {
  mockTruncation.isTruncated = false
})

// The badge used to be painted over the value label as an absolute overlay, so a
// long model name was cut mid-word underneath it. Nothing may paint over the
// value any more — the trigger shows the name and nothing else.
describe('LLMSelector — premium badge layout', () => {
  const renderSelector = () =>
    render(<LLMSelector value={LONG_PREMIUM_VALUE} onChange={vi.fn()} allowEmpty />)

  it('renders no absolutely-positioned overlay over the trigger value', () => {
    const { container } = renderSelector()

    expect(container.querySelector('.absolute.inset-x-0')).toBeNull()
    expect(screen.getByTestId('llm-selector-premium-note').closest('.absolute')).toBeNull()
  })

  it('gives the option row a full-width wrapper whose label truncates on its own line', () => {
    const { container } = renderSelector()

    fireEvent.click(container.querySelector('.p-multiselect')!)

    const premiumRow = screen
      .getAllByTestId('llm-option-row')
      .find((row) => row.textContent?.includes(LONG_PREMIUM_LABEL))

    expect(premiumRow).toBeDefined()
    expect(premiumRow!.className).toContain('w-full')

    const labelEl = premiumRow!.children[0]
    expect(labelEl).toHaveTextContent(LONG_PREMIUM_LABEL)
    expect(labelEl.className).toContain('min-w-0')
    expect(labelEl.className).toContain('truncate')
  })
})

// Premium stops competing for the row's width: it reads on a second line under
// the model name, exactly like the chat selector's `Recommended` subtitle. The
// row still owns the premium hover — one anchor per row, none nested inside it.
describe('LLMSelector — premium meta line in option rows', () => {
  const premiumRow = () =>
    screen
      .getAllByTestId('llm-option-row')
      .find((row) => row.textContent?.includes(LONG_PREMIUM_LABEL))!

  it('renders a Premium meta line instead of any badge on a premium option row', () => {
    openPanel()

    const row = premiumRow()
    const meta = row.querySelector<HTMLElement>('[data-testid="llm-option-meta"]')!
    expect(meta).not.toBeNull()
    expect(meta.textContent).toBe('Premium')
    expect(row.querySelector('[role="status"]')).toBeNull()
    expect(row.querySelector('[data-testid="premium-model-dot"]')).toBeNull()
    expect(row.querySelector('[data-testid="premium-model-text"]')).toBeNull()
  })

  it('anchors the premium hover on the option row wrapper', () => {
    openPanel()

    const row = premiumRow()
    expect(row.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(row.getAttribute('data-tooltip-content')).toBe(PREMIUM_MODEL_TOOLTIP)
    expect(row.querySelectorAll('[data-tooltip-id]')).toHaveLength(0)
  })

  it('carries no premium hover and no meta line on a standard option row', () => {
    openPanel()

    const row = screen.getAllByTestId('llm-option-row').find((r) => r.textContent === 'GPT-4o')!
    expect(row.hasAttribute('data-tooltip-content')).toBe(false)
    expect(row.querySelector('[data-testid="llm-option-meta"]')).toBeNull()
  })

  // The container query fired here but not in the chat panel, at comparable row
  // widths. Nothing inside a row depends on the row's own width any more, so the
  // query container goes with it.
  it('establishes no query container on the option row', () => {
    openPanel()

    const row = premiumRow()
    expect(row.className).not.toContain('premium-badge-container')
  })

  it('leaves the trigger showing the model name alone', () => {
    const container = openPanel()

    const triggerLabel = container.querySelector('[data-pc-section="label"]')!
    expect(triggerLabel.textContent).toBe(LONG_PREMIUM_LABEL)
  })
})

// CR-002: the row anchored the premium sentence and nothing else, so a model
// name too long for this narrow field could not be read by any means — while the
// chat selector, rewritten in the same change, showed it on hover. Both
// selectors now compose one content string per row from the same two parts.
describe('LLMSelector — full name on hover when the row truncates it', () => {
  const rowFor = (label: string) =>
    screen.getAllByTestId('llm-option-row').find((row) => row.textContent?.includes(label))!

  it('shows the full name and the premium sentence in one tooltip on a truncated premium row', () => {
    mockTruncation.isTruncated = true
    openPanel()

    const row = rowFor(LONG_PREMIUM_LABEL)
    expect(row.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(row.getAttribute('data-tooltip-content')).toBe(
      `${LONG_PREMIUM_LABEL} · ${PREMIUM_MODEL_TOOLTIP}`
    )
    // Still exactly one anchor in the row's subtree — never two overlapping.
    expect(row.querySelectorAll('[data-tooltip-id]')).toHaveLength(0)
  })

  it('shows the full name on a truncated standard row, which anchored nothing before', () => {
    mockTruncation.isTruncated = true
    openPanel()

    const row = rowFor('GPT-4o')
    expect(row.getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(row.getAttribute('data-tooltip-content')).toBe('GPT-4o')
  })

  it('keeps the premium sentence alone when the name fits', () => {
    openPanel()

    const row = rowFor(LONG_PREMIUM_LABEL)
    expect(row.getAttribute('data-tooltip-content')).toBe(PREMIUM_MODEL_TOOLTIP)
  })

  it('anchors nothing on a standard row whose name fits', () => {
    openPanel()

    const row = rowFor('GPT-4o')
    expect(row.hasAttribute('data-tooltip-id')).toBe(false)
    expect(row.hasAttribute('data-tooltip-content')).toBe(false)
  })
})

// Follow-up 6: option F read as a validation error in the running app — an amber
// ring around a form control is what an invalid field looks like, and a bare
// amber `Premium` beneath it is what its error message looks like. The ring goes,
// the note names the state (`Premium model`) and the explanation moves onto the
// same TooltipButton affordance the form already uses for field hints.
describe('LLMSelector — premium on the closed trigger', () => {
  const HINT = 'Selecting a model here forces every assistant to use it.'

  const renderSelector = renderTriggerSurface

  const premiumAnchors = (container: HTMLElement) =>
    Array.from(container.querySelectorAll(`[data-tooltip-content="${PREMIUM_MODEL_TOOLTIP}"]`))

  it('renders no premium badge inside the trigger', () => {
    const { container } = renderSelector()

    const triggerLabel = container.querySelector('[data-pc-section="label"]')!
    expect(triggerLabel.textContent).toBe(LONG_PREMIUM_LABEL)
    expect(triggerLabel.querySelector('[data-tooltip-id]')).toBeNull()
  })

  it('leaves the control on its normal border when a premium model is selected', () => {
    const { container } = renderSelector()

    const control = container.querySelector('.p-multiselect')!
    expect(control.className).not.toContain('ring-1')
    expect(control.className).not.toContain('ring-aborted-primary')
  })

  it('names the state beneath the field as `Premium model`, not an amber error line', () => {
    renderSelector()

    const note = screen.getByTestId('llm-selector-premium-note')
    expect(note.textContent).toBe('Premium model')
    expect(note.className).not.toContain('text-aborted-primary')
  })

  it('carries the premium explanation on an info affordance, not on the note text', () => {
    const { container } = renderSelector()

    const note = screen.getByTestId('llm-selector-premium-note')
    // Task 5: exactly one premium anchor per surface, and never nested — the note
    // text must not anchor as well as the info button beside it.
    expect(note.hasAttribute('data-tooltip-id')).toBe(false)

    const anchors = premiumAnchors(container)
    expect(anchors).toHaveLength(1)
    expect(anchors[0].getAttribute('data-tooltip-id')).toBe('react-tooltip')
    expect(anchors[0].getAttribute('aria-label')).toBe('More information')
    expect(note.contains(anchors[0])).toBe(false)
  })

  it('keeps a caller-supplied hint alongside the premium note', () => {
    const { container } = renderSelector({ hint: HINT })

    expect(container.querySelector(`[data-tooltip-content="${HINT}"]`)).not.toBeNull()
    expect(screen.getByTestId('llm-selector-premium-note')).not.toBeNull()
    expect(premiumAnchors(container)).toHaveLength(1)
  })

  it('renders no ring, note or premium anchor for a non-premium selection', () => {
    const { container } = renderSelector({ value: 'gpt-4o' })

    expect(container.querySelector('.p-multiselect')!.className).not.toContain(
      'ring-aborted-primary'
    )
    expect(screen.queryByTestId('llm-selector-premium-note')).toBeNull()
    expect(premiumAnchors(container)).toHaveLength(0)
  })

  it('still renders the placeholder when nothing is selected', () => {
    const { container } = renderSelector({ value: '' })

    expect(container.querySelector('[data-pc-section="label"]')!.textContent).toBe(
      'Assistant Default'
    )
    expect(screen.queryByTestId('llm-selector-premium-note')).toBeNull()
  })
})

// Follow-up 7: the chat tip ends with `View models and rates`; the assistant form
// stopped at naming the state, so premium was a dead end here. The link is visible
// text rather than tooltip-only content — a link reachable only on hover cannot be
// tabbed to, and Task 10 now closes tooltips on scroll.
describe('LLMSelector — models-and-rates link on the premium note', () => {
  const LINK_TEXT = 'View models and rates'

  const renderSelector = renderTriggerSurface

  it('links the premium note to the models catalog', () => {
    renderSelector()

    const link = screen.getByRole('link', { name: LINK_TEXT })
    expect(link.getAttribute('href')).toBe(HELP_MODELS_ROUTE)
  })

  it('renders the link as visible, tab-reachable text beside the note', () => {
    renderSelector()

    const link = screen.getByRole('link', { name: LINK_TEXT })
    expect(link.tagName).toBe('A')
    expect(link.getAttribute('tabindex')).not.toBe('-1')
    // Tooltip content lives in an attribute, never in the DOM as a sibling node —
    // being a real element next to the note is what makes the link focusable.
    const note = screen.getByTestId('llm-selector-premium-note')
    expect(note.parentElement!.contains(link)).toBe(true)
  })

  it('keeps the info button as the single premium tooltip anchor', () => {
    const { container } = renderSelector()

    const link = screen.getByRole('link', { name: LINK_TEXT })
    expect(link.hasAttribute('data-tooltip-id')).toBe(false)
    expect(link.hasAttribute('data-tooltip-content')).toBe(false)
    expect(link.closest('[data-tooltip-id]')).toBeNull()

    const anchors = Array.from(
      container.querySelectorAll(`[data-tooltip-content="${PREMIUM_MODEL_TOOLTIP}"]`)
    )
    expect(anchors).toHaveLength(1)
    expect(anchors[0].getAttribute('aria-label')).toBe('More information')
    expect(anchors[0].contains(link)).toBe(false)
  })

  it('renders no catalog link for a non-premium selection', () => {
    renderSelector({ value: 'gpt-4o' })

    expect(screen.queryByRole('link', { name: LINK_TEXT })).toBeNull()
  })
})
