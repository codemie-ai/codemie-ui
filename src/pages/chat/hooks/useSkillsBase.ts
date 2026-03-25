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

import { useCallback, useEffect, useRef, useState } from 'react'

import { SKILLS_SEARCH_DEBOUNCE_DELAY } from '@/constants/skills'
import { skillsStore } from '@/store/skills'
import { Skill, SkillSortBy } from '@/types/entity/skill'

interface UseSkillsBaseOptions {
  onFetchSuccess?: (skills: Skill[]) => void
  onFetchError?: (error: unknown) => void
}

interface UseSkillsBaseReturn {
  skills: Skill[]
  loading: boolean
  setSkills: (skills: Skill[]) => void
  setLoading: (loading: boolean) => void
  debouncedFetch: (fetchFn: () => Promise<Skill[]>) => void
  immediateReset: () => void
}

/**
 * Base hook for skills fetching with shared business logic.
 * Provides debounced search, loading state, and cleanup.
 * Use specialized wrappers (useChatConfigSkills, useChatSkillsSelector) instead of using this directly.
 */
export const useSkillsBase = (options?: UseSkillsBaseOptions): UseSkillsBaseReturn => {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stabilize callbacks with refs to avoid unnecessary debouncedFetch recreations
  const onFetchSuccessRef = useRef(options?.onFetchSuccess)
  const onFetchErrorRef = useRef(options?.onFetchError)

  useEffect(() => {
    onFetchSuccessRef.current = options?.onFetchSuccess
    onFetchErrorRef.current = options?.onFetchError
  }, [options?.onFetchSuccess, options?.onFetchError])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  /**
   * Execute a fetch function with debounce delay
   */
  const debouncedFetch = useCallback((fetchFn: () => Promise<Skill[]>) => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Debounce the fetch
    debounceTimer.current = setTimeout(async () => {
      try {
        setLoading(true)
        const fetchedSkills = await fetchFn()
        setSkills(fetchedSkills)
        onFetchSuccessRef.current?.(fetchedSkills)
      } catch (error) {
        console.error('[useSkillsBase] Error fetching skills:', error)
        setSkills([])
        onFetchErrorRef.current?.(error)
      } finally {
        setLoading(false)
      }
    }, SKILLS_SEARCH_DEBOUNCE_DELAY)
  }, [])

  /**
   * Clear timer and reset state immediately
   */
  const immediateReset = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    setSkills([])
    setLoading(false)
  }, [])

  return {
    skills,
    loading,
    setSkills,
    setLoading,
    debouncedFetch,
    immediateReset,
  }
}

/**
 * Helper function for fetching skills with filters
 */
export const fetchSkillsWithFilters = async (
  search: string,
  page: number,
  pageSize: number
): Promise<Skill[]> => {
  const filters = search.trim() ? { search: search.trim() } : {}
  // Use relevance sorting for chat context
  return skillsStore.indexSkills(filters, page, pageSize, SkillSortBy.RELEVANCE)
}
