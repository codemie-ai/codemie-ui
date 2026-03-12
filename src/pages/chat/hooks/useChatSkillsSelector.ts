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

import { useCallback, useRef, useState } from 'react'

import { SKILLS_PER_PAGE } from '@/constants/skills'
import { skillsStore } from '@/store/skills'
import { Pagination } from '@/types/common'
import { Skill } from '@/types/entity/skill'

import { fetchSkillsWithFilters, useSkillsBase } from './useSkillsBase'

interface UseChatSkillsSelectorReturn {
  skills: Skill[]
  loading: boolean
  pagination: Pagination
  currentPage: number
  searchQuery: string
  setSearchQuery: (query: string) => void
  setPage: (page: number) => void
  reset: () => void
  initialLoad: () => Promise<void>
}

const DEFAULT_PAGINATION: Pagination = {
  page: 0,
  perPage: SKILLS_PER_PAGE,
  totalPages: 0,
  totalCount: 0,
}

/**
 * Specialized hook for chat skills selector modal.
 * Provides paginated search with full pagination support.
 * Wraps useSkillsBase with pagination-specific logic.
 */
export const useChatSkillsSelector = (): UseChatSkillsSelectorReturn => {
  const { skills, loading, setSkills, setLoading, debouncedFetch, immediateReset } = useSkillsBase()

  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION)
  const [currentPage, setCurrentPage] = useState(0)
  const [searchQuery, setSearchQueryState] = useState('')

  const currentSearchRef = useRef('')

  const updatePaginationFromStore = useCallback(() => {
    const {
      totalCount,
      perPage: storePerPage,
      totalPages: storeTotalPages,
      page: storePage,
    } = skillsStore.skillsPagination

    const perPage = storePerPage || SKILLS_PER_PAGE
    // Calculate totalPages from totalCount if store returns default value of 1
    const calculatedTotalPages = Math.ceil(totalCount / perPage)
    const totalPages =
      calculatedTotalPages > storeTotalPages ? calculatedTotalPages : storeTotalPages

    setPagination({
      page: storePage,
      perPage,
      totalPages,
      totalCount,
    })
  }, [])

  const fetchSkills = useCallback(
    async (search: string, page: number) => {
      try {
        setLoading(true)
        const fetchedSkills = await fetchSkillsWithFilters(search, page, SKILLS_PER_PAGE)
        setSkills(fetchedSkills)
        setCurrentPage(page)
        updatePaginationFromStore()
      } catch (error) {
        console.error('[useChatSkillsSelector] Error fetching skills:', error)
        setSkills([])
        setPagination(DEFAULT_PAGINATION)
      } finally {
        setLoading(false)
      }
    },
    [setSkills, setLoading, updatePaginationFromStore]
  )

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchQueryState(query)
      currentSearchRef.current = query
      debouncedFetch(async () => {
        const fetchedSkills = await fetchSkillsWithFilters(query, 0, SKILLS_PER_PAGE)
        setCurrentPage(0)
        updatePaginationFromStore()
        return fetchedSkills
      })
    },
    [debouncedFetch, updatePaginationFromStore]
  )

  const setPage = useCallback(
    (page: number) => {
      fetchSkills(currentSearchRef.current, page)
    },
    [fetchSkills]
  )

  const reset = useCallback(() => {
    immediateReset()
    setSearchQueryState('')
    currentSearchRef.current = ''
    setCurrentPage(0)
    setPagination(DEFAULT_PAGINATION)
  }, [immediateReset])

  const initialLoad = useCallback(async () => {
    currentSearchRef.current = ''
    setSearchQueryState('')
    await fetchSkills('', 0)
  }, [fetchSkills])

  return {
    skills,
    loading,
    pagination,
    currentPage,
    searchQuery,
    setSearchQuery,
    setPage,
    reset,
    initialLoad,
  }
}
