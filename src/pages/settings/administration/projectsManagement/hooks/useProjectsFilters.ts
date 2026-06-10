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

import { useState, useEffect, useCallback, useRef } from 'react'

import { BudgetCategory, BUDGET_CATEGORY_OPTIONS } from '@/types/entity/budget'
import { FILTER_ENTITY, FilterKeys, getFilters, setFilters } from '@/utils/filters'

const PROJECT_FILTER_KEYS: FilterKeys = {
  simple: ['search', 'budget_assignment', 'budget_category'],
  boolean: [],
  multiple: [],
}

interface StoredProjectFilters {
  search?: string
  budget_assignment?: string
  budget_category?: string
}

const parseBudgetAssignment = (value: unknown): 'all' | 'assigned' =>
  value === 'assigned' ? 'assigned' : 'all'

const parseBudgetCategory = (value: unknown): BudgetCategory | '' =>
  BUDGET_CATEGORY_OPTIONS.some((o) => o.value === value) ? (value as BudgetCategory) : ''

const getInitialFilters = () => {
  const saved = getFilters<StoredProjectFilters>(FILTER_ENTITY.PROJECTS, PROJECT_FILTER_KEYS)
  return {
    search: typeof saved.search === 'string' ? saved.search : '',
    budgetAssignmentFilter: parseBudgetAssignment(saved.budget_assignment),
    budgetCategory: parseBudgetCategory(saved.budget_category),
  }
}

export const useProjectsFilters = () => {
  const [
    {
      search: initialSearch,
      budgetAssignmentFilter: initialAssignment,
      budgetCategory: initialCategory,
    },
  ] = useState(getInitialFilters)

  const [search, setSearch] = useState<string>(initialSearch)
  const [budgetAssignmentFilter, setBudgetAssignmentFilter] = useState<'all' | 'assigned'>(
    initialAssignment
  )
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory | ''>(initialCategory)

  const isMounted = useRef(false)

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    const toStore: StoredProjectFilters = {}
    if (search) toStore.search = search
    if (budgetAssignmentFilter === 'assigned') toStore.budget_assignment = budgetAssignmentFilter
    if (budgetCategory) toStore.budget_category = budgetCategory
    setFilters(FILTER_ENTITY.PROJECTS, toStore)
  }, [search, budgetAssignmentFilter, budgetCategory])

  const handleSetSearch = useCallback((value: string) => setSearch(value), [])
  const handleSetBudgetAssignmentFilter = useCallback(
    (value: 'all' | 'assigned') => setBudgetAssignmentFilter(value),
    []
  )
  const handleSetBudgetCategory = useCallback(
    (value: BudgetCategory | '') => setBudgetCategory(value),
    []
  )

  return {
    search,
    budgetAssignmentFilter,
    budgetCategory,
    setSearch: handleSetSearch,
    setBudgetAssignmentFilter: handleSetBudgetAssignmentFilter,
    setBudgetCategory: handleSetBudgetCategory,
  }
}
