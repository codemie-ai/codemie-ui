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

import { FC, useCallback, useEffect, useRef, useState } from 'react'

import SearchSvg from '@/assets/icons/search.svg?react'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import { analyticsStore } from '@/store/analytics'
import type { LeaderboardEntriesParams } from '@/types/analytics'

import { TIER_FILTER_OPTIONS, INTENT_FILTER_OPTIONS } from './constants'

interface LeaderboardFiltersProps {
  filters: LeaderboardEntriesParams
  onChange: (filters: Partial<LeaderboardEntriesParams>) => void
}

const LeaderboardFilters: FC<LeaderboardFiltersProps> = ({ filters, onChange }) => {
  const [projects, setProjects] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    analyticsStore
      .fetchLeaderboardProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onChange({ search: value || undefined, page: 0 })
      }, 350)
    },
    [onChange]
  )

  const projectOptions = [
    { value: '', label: 'All Projects' },
    ...projects.map((p) => ({ value: p, label: p })),
  ]

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        placeholder="Search by name or email..."
        value={searchValue}
        onChange={(e) => handleSearchChange(e.target.value)}
        leftIcon={<SearchSvg className="h-4 w-4 text-text-quaternary" />}
        rootClass="w-[270px] shrink-0"
      />

      <Select
        value={filters.tier ?? null}
        onChange={(e) => onChange({ tier: (e.value as string) || undefined, page: 0 })}
        options={TIER_FILTER_OPTIONS}
        placeholder="All Tiers"
        className="min-w-[130px]"
      />

      <Select
        value={filters.intent ?? null}
        onChange={(e) => onChange({ intent: (e.value as string) || undefined, page: 0 })}
        options={INTENT_FILTER_OPTIONS}
        placeholder="All Intents"
        className="min-w-[130px]"
      />

      {projects.length > 0 && (
        <Select
          value={filters.project ?? null}
          onChange={(e) => onChange({ project: (e.value as string) || undefined, page: 0 })}
          options={projectOptions}
          placeholder="All Projects"
          className="min-w-[130px]"
        />
      )}
    </div>
  )
}

export default LeaderboardFilters
