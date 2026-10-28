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

/**
 * Cleanup-filter vocabularies — EXECUTION-PLAN 10.5, spec §2.8b and F-56.
 *
 * Both dropdowns covered here are **pure functions of props or of a module
 * constant**, which is precisely the vitest half of the layering rule
 * (`review-e2e-coverage-spec.md` §5). The browser counterpart asserts that the
 * reason dropdown offers more than one option and that choosing one returns
 * rows whose reason cell matches — a wiring question that needs a real server.
 * Deriving the option list itself does not, and does not deserve a browser.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { CleanupReason } from '@/types/generated/marketplaceManagement'

import { USAGE_TIERS } from '../../filterVocabulary'
import MarketplaceCleanupFilters, {
  TIER_OPTIONS,
  type CleanupFilterState,
} from '../MarketplaceCleanupFilters'
import { reasonLabel } from '../ReasonChip'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ json: async () => ({}) }),
    post: vi.fn().mockResolvedValue({ json: async () => ({}) }),
  },
}))

/**
 * `Select` is PrimeReact's `Dropdown`, which renders only the *selected*
 * option into the DOM and builds the rest into an overlay it appends to
 * `document.body` on open — with the labels present but the values nowhere.
 * The unit under test is the derivation, not PrimeReact, so the control is
 * replaced by a plain `<select>` that renders every option it was handed.
 */
vi.mock('@/components/form/Select/Select', () => ({
  default: ({
    options,
    value,
    ...rest
  }: {
    options: Array<{ label: string; value: string }>
    value: string
    [key: string]: unknown
  }) => (
    <select data-testid={rest['data-testid'] as string} data-value={value} defaultValue={value}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

const BASE_FILTERS: CleanupFilterState = {
  query: '',
  bucket: 'DELETE',
  reason: null,
  tier: null,
  verdict: null,
  mcp: null,
  category: null,
}

/**
 * The option list a `Select` renders, read back off the hidden native
 * `<select>` PrimeReact keeps inside the control. Reading the DOM rather than
 * exporting the `useMemo` keeps the assertion on what a user can actually pick.
 */
const optionsOf = (testId: string): Array<{ label: string; value: string }> =>
  Array.from(screen.getByTestId(testId).querySelectorAll('option')).map((o) => ({
    label: (o.textContent ?? '').trim(),
    value: o.getAttribute('value') ?? '',
  }))

const renderFilters = (
  cleanupReasons?: Record<string, number> | null,
  filters: CleanupFilterState = BASE_FILTERS
) =>
  render(
    <MarketplaceCleanupFilters
      filters={filters}
      facets={null}
      cleanupReasons={cleanupReasons}
      onApply={vi.fn()}
      onClear={vi.fn()}
    />
  )

/**
 * §2.8b. The chain that broke silently: `/overview` never emitted
 * `cleanup_reasons`, the FE type marked the key optional so nothing complained,
 * the consumer defaulted to `{}`, and the dropdown rendered exactly one option
 * forever. No error, no warning, no failing type-check — which is why the
 * derivation is pinned here and the ">1 option" check lives in the browser.
 */
describe('MarketplaceCleanupFilters — REASON_OPTIONS derivation', () => {
  it('derives one option per reported reason, plus "All Reasons"', () => {
    renderFilters({ invalid: 4, duplicate: 2 })

    const options = optionsOf('clnReason-select')
    expect(options).toHaveLength(3)
    expect(options[0]).toEqual({ label: 'All Reasons', value: '' })
    // Sorted, so the control does not reshuffle between renders of the same map.
    expect(options.slice(1).map((o) => o.value)).toEqual(['duplicate', 'invalid'])
  })

  it('collapses to "All Reasons" only when the producer reports nothing', () => {
    const first = renderFilters()
    expect(optionsOf('clnReason-select')).toEqual([{ label: 'All Reasons', value: '' }])
    first.unmount()

    // `null` is the shape the page passes while the overview is still in
    // flight (`snap.overview?.cleanup_reasons ?? null`) and must behave the same.
    renderFilters(null)
    expect(optionsOf('clnReason-select')).toEqual([{ label: 'All Reasons', value: '' }])
  })

  it('keeps a reason arriving from a drill-down link even when the map omits it', () => {
    // An Overview drill-down can carry `?reason=dead` before the reason map has
    // loaded. Dropping it would silently reset the control to "All Reasons"
    // while the URL and the table still said otherwise.
    renderFilters({ invalid: 4 }, { ...BASE_FILTERS, reason: 'dead' })

    const values = optionsOf('clnReason-select').map((o) => o.value)
    expect(values).toContain('dead')
    expect(values).toContain('invalid')
  })

  it('labels options with the same vocabulary the table cell uses', () => {
    renderFilters({ invalid: 4, duplicate: 2 })

    const options = optionsOf('clnReason-select')
    // `reasonLabel` is what `cleanup-reason-text` renders. A private humanise()
    // here made the dropdown say "Invalid" while every row it returned said
    // "Fails quality checks", so a correctly filtered table read as the wrong
    // rows (F-32/F-68).
    for (const { value, label } of options.slice(1)) {
      expect(label).toBe(reasonLabel(value))
    }
    expect(options.map((o) => o.label)).toContain('Fails quality checks')
  })
})

/**
 * F-56. `?tier=COOL` returns 0 rows and, since EXECUTION-PLAN 4.2 enum-typed the
 * filter params, a **422** — so an invented option is no longer a quietly empty
 * table but a red error banner. The vocabulary is a module constant, so this is
 * the cheapest possible place to pin it.
 */
describe('MarketplaceCleanupFilters — tier vocabulary', () => {
  it('never offers COOL', () => {
    renderFilters({})

    const values = optionsOf('clnTier-select').map((o) => o.value)
    expect(values).not.toContain('COOL')
    expect(TIER_OPTIONS.map((o) => o.value)).not.toContain('COOL')
    expect(TIER_OPTIONS.map((o) => o.label)).not.toContain('Cool')
  })

  it('offers exactly the audit engine UsageTier members, plus "all"', () => {
    renderFilters({})

    const values = optionsOf('clnTier-select').map((o) => o.value)
    // Exhaustive in both directions: a member the backend adds and this file
    // misses fails here, and so does one this file invents.
    expect(values).toEqual(['', ...USAGE_TIERS])
    expect(new Set(USAGE_TIERS as string[])).toEqual(new Set(['HOT', 'WARM', 'COLD', 'DEAD']))
  })
})

/** Guards the cast used above: `CleanupReason` must still contain these codes. */
describe('cleanup reason vocabulary', () => {
  it('labels every reason code the API can emit', () => {
    const codes: CleanupReason[] = [
      'duplicate',
      'purpose_duplicate',
      'semantic_clone',
      'invalid',
      'dead',
    ]
    for (const code of codes) {
      // A code with no mapping falls back to a humanised form, which would be
      // indistinguishable from a real label — assert the mapped ones explicitly.
      expect(reasonLabel(code)).not.toBe('')
    }
    expect(reasonLabel('invalid')).toBe('Fails quality checks')
    expect(reasonLabel('semantic_clone')).toBe('Near-identical copy')
  })
})
