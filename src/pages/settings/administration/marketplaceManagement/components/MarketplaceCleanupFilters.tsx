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

import React, { FC, useState, useCallback, useMemo, useEffect, useRef } from 'react'

import CrossIcon from '@/assets/icons/cross.svg?react'
import SearchIcon from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import Select from '@/components/form/Select/Select'
import { useDebouncedApply } from '@/hooks/useDebounceApply'
import type { FilterOption } from '@/types/filters'
import type { Bucket, FacetsResponse, UsageTier } from '@/types/generated/marketplaceManagement'

import { USAGE_TIERS, VERDICT_KINDS } from '../filterVocabulary'
import { reasonLabel, verdictKindLabel } from './ReasonChip'
import { ALL_BUCKETS } from '../hooks/useMarketplaceFilters'

// Both dropdowns are built from the vocabularies in `filterVocabulary.ts`,
// which are exhaustive against the generated enums. Since EXECUTION-PLAN 4.2
// an unknown `bucket`/`tier` is a 422, so an option this file invents is not a
// zero-row table any more — it is a red error banner (F-56, F-68).
const BUCKET_LABEL: Record<Bucket, string> = {
  DELETE: 'Delete',
  VERIFIED: 'Qualified',
  COMMUNITY: 'Community',
}

const BUCKET_OPTIONS: FilterOption[] = [
  { label: 'All', value: ALL_BUCKETS },
  { label: BUCKET_LABEL.VERIFIED, value: 'VERIFIED' },
  { label: BUCKET_LABEL.COMMUNITY, value: 'COMMUNITY' },
  { label: BUCKET_LABEL.DELETE, value: 'DELETE' },
]

// Tier vocabulary MUST match the audit engine's UsageTier enum (HOT, WARM,
// COLD, DEAD) and the TierChip labels rendered in the cleanup table. "Cool"
// was never a member — selecting it emptied the table with no explanation.
const TIER_LABEL: Record<UsageTier, string> = {
  HOT: 'Hot',
  WARM: 'Warm',
  COLD: 'Cold',
  DEAD: 'Dead',
}

export const TIER_OPTIONS: FilterOption[] = [
  { label: 'All Tiers', value: '' },
  ...USAGE_TIERS.map((value) => ({ label: TIER_LABEL[value], value })),
]

// Decision vocabulary mirrors the audit engine's VerdictKind enum. Reuses
// `verdictKindLabel` — the same mapping the Decision table column uses — so a
// dropdown option and the rows it filters to never say different things.
export const DECISION_OPTIONS: FilterOption[] = [
  { label: 'All Decisions', value: '' },
  ...VERDICT_KINDS.map((value) => ({ label: verdictKindLabel(value), value })),
]

export interface CleanupFilterState {
  query: string
  bucket: string
  reason: string | null
  tier: string | null
  verdict: string | null
  mcp: string | null
  category: string | null
}

interface MarketplaceCleanupFiltersProps {
  filters: CleanupFilterState
  facets: FacetsResponse | null
  /** `overview.cleanup_reasons` — reason code → count, straight from the API. */
  cleanupReasons?: Record<string, number> | null
  /** True when a rule filter is active in the parent store (rule is not in CleanupFilterState). */
  hasRuleFilter?: boolean
  onApply: (filters: CleanupFilterState) => void
  onClear: () => void
}

const MarketplaceCleanupFilters: FC<MarketplaceCleanupFiltersProps> = ({
  filters,
  facets,
  cleanupReasons,
  hasRuleFilter,
  onApply,
  onClear,
}) => {
  const [local, setLocal] = useState<CleanupFilterState>(filters)

  // Keep the local dropdown state in sync when the parent-provided filters
  // change (e.g. hydrated from URL params after mount, or after a
  // programmatic clear). Without this, the dropdowns freeze on their
  // initial-render defaults and stay out of sync with the URL.
  const skipNextSyncRef = useRef(false)
  useEffect(() => {
    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false
      return
    }
    setLocal(filters)
  }, [filters])

  const mcpOptions = useMemo<FilterOption[]>(() => {
    const base: FilterOption[] = [{ label: 'All MCPs', value: '' }]
    if (!facets) return base
    return [
      ...base,
      ...facets.mcps.map((m) => ({ label: `${m.value} (${m.count})`, value: m.value })),
    ]
  }, [facets])

  const categoryOptions = useMemo<FilterOption[]>(() => {
    const base: FilterOption[] = [{ label: 'All Categories', value: '' }]
    if (!facets) return base
    return [
      ...base,
      ...facets.categories.map((c) => ({ label: `${c.value} (${c.count})`, value: c.value })),
    ]
  }, [facets])

  const applyFilters = useCallback(() => {
    onApply(local)
  }, [local, onApply])

  useDebouncedApply(local.query, 500, applyFilters)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal((prev) => ({ ...prev, query: e.target.value }))
  }

  const handleSelectChange = (field: keyof CleanupFilterState) => (e: { value: unknown }) => {
    // Compute the next state, update local, AND fire the parent's apply
    // callback in the same tick so dropdown changes filter the table
    // immediately (no "Apply" button click required). The ref guard
    // prevents the useEffect above from clobbering `local` when the
    // parent echoes the same state back through props.
    // PrimeReact leaks the whole option object instead of '' when an
    // option's value is the empty string (the "All ___" sentinel every
    // dropdown here uses) — coerce back to a string first, as the other
    // marketplace filter panels do.
    const value = typeof e.value === 'string' ? e.value : ''
    const next: CleanupFilterState = ['reason', 'tier', 'verdict', 'mcp', 'category'].includes(
      field as string
    )
      ? { ...local, [field]: value === '' ? null : value }
      : { ...local, [field]: value }
    skipNextSyncRef.current = true
    setLocal(next)
    onApply(next)
  }

  const handleClear = () => {
    const cleared: CleanupFilterState = {
      query: '',
      bucket: ALL_BUCKETS,
      reason: null,
      tier: null,
      verdict: null,
      mcp: null,
      category: null,
    }
    setLocal(cleared)
    onClear()
  }

  const hasActiveFilters =
    local.query !== '' ||
    local.bucket !== ALL_BUCKETS ||
    local.reason != null ||
    local.tier != null ||
    local.verdict != null ||
    local.mcp != null ||
    local.category != null ||
    hasRuleFilter

  // Reason options come from the values the API actually reports
  // (`overview.cleanup_reasons`), not a hardcoded guess — the static list used
  // lowercase slugs that no response was guaranteed to contain, so choosing an
  // option could filter to zero rows. The current value is always included so
  // a reason arriving from an Overview drill-down link is still displayed
  // rather than silently falling back to "All Reasons".
  const REASON_OPTIONS: FilterOption[] = useMemo(() => {
    const values = new Set<string>(Object.keys(cleanupReasons ?? {}))
    if (local.reason) values.add(local.reason)
    return [
      { label: 'All Reasons', value: '' },
      // `reasonLabel` — the same function the table cell uses — rather than a
      // local humanise(). A private transform here made the dropdown say
      // "Invalid" while every row it returned said "Fails quality checks", so a
      // correctly filtered table looked like the wrong rows. One vocabulary,
      // one source (F-32/F-68).
      ...[...values]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ label: reasonLabel(value), value })),
    ]
  }, [cleanupReasons, local.reason])

  return (
    // Wrap to a second row on narrow viewports instead of forcing a
    // horizontal scroll — 8 dropdowns squeezed into one strip made the
    // labels illegible on standard laptop widths.
    <div className="flex flex-wrap gap-x-3 gap-y-2 items-end pb-1">
      <div className="min-w-[128px] w-44 flex-shrink-0">
        <Input
          label="Search"
          placeholder="Search assistants"
          value={local.query}
          onChange={handleSearchChange}
          leftIcon={<SearchIcon className="w-4 h-4 text-text-tertiary" />}
          className="w-full"
        />
      </div>

      <div className="min-w-[128px] w-40 flex-shrink-0">
        <Select
          data-testid="clnBucket-select"
          data-value={local.bucket}
          label="Bucket"
          options={BUCKET_OPTIONS}
          value={local.bucket}
          onChange={handleSelectChange('bucket')}
        />
      </div>

      <div className="min-w-[128px] w-36 flex-shrink-0">
        <Select
          data-testid="clnReason-select"
          data-value={local.reason ?? ''}
          label="Reason"
          options={REASON_OPTIONS}
          value={local.reason ?? ''}
          onChange={handleSelectChange('reason')}
        />
      </div>

      <div className="min-w-[128px] w-32 flex-shrink-0">
        <Select
          data-testid="clnTier-select"
          data-value={local.tier ?? ''}
          label="Tier"
          options={TIER_OPTIONS}
          value={local.tier ?? ''}
          onChange={handleSelectChange('tier')}
        />
      </div>

      <div className="min-w-[128px] w-40 flex-shrink-0">
        <Select
          data-testid="clnVerdict-select"
          data-value={local.verdict ?? ''}
          label="Decision"
          options={DECISION_OPTIONS}
          value={local.verdict ?? ''}
          onChange={handleSelectChange('verdict')}
        />
      </div>

      <div className="min-w-[128px] w-40 flex-shrink-0">
        <Select
          data-testid="clnMcp-select"
          data-value={local.mcp ?? ''}
          label="MCP"
          options={mcpOptions}
          value={local.mcp ?? ''}
          onChange={handleSelectChange('mcp')}
        />
      </div>

      <div className="min-w-[128px] w-40 flex-shrink-0">
        <Select
          data-testid="clnCategory-select"
          data-value={local.category ?? ''}
          label="Category"
          options={categoryOptions}
          value={local.category ?? ''}
          onChange={handleSelectChange('category')}
        />
      </div>

      {/* Dropdowns auto-apply on change (see handleSelectChange above) and
          search debounces (useDebouncedApply). "Apply" is dead weight in
          that model — only "Clear all" stays. */}
      {hasActiveFilters && (
        <div className="flex items-end gap-2 flex-shrink-0">
          {/* The label is unconditional: hiding it left an icon-only button
              with no accessible name and no tooltip. */}
          <Button
            onClick={handleClear}
            variant="tertiary"
            className="h-8 gap-[5px]"
            aria-label="Clear all filters"
          >
            <CrossIcon className="w-3.5 h-3.5" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}

export default MarketplaceCleanupFilters
