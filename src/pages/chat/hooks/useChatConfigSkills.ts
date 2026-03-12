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

import { useCallback, useRef } from 'react'

import { SKILLS_DROPDOWN_LIMIT } from '@/constants/skills'
import { Skill } from '@/types/entity/skill'

import { fetchSkillsWithFilters, useSkillsBase } from './useSkillsBase'

interface UseChatConfigSkillsReturn {
  skills: Skill[]
  loading: boolean
  searchSkills: (query: string) => void
  initialLoad: () => Promise<void>
  reset: () => void
}

/**
 * Specialized hook for chat config skills dropdown.
 * Provides simple search with fixed limit, no pagination.
 * Wraps useSkillsBase with dropdown-specific logic.
 */
export const useChatConfigSkills = (): UseChatConfigSkillsReturn => {
  const { skills, loading, setSkills, setLoading, debouncedFetch, immediateReset } = useSkillsBase()

  const loadedRef = useRef(false)

  const fetchSkills = useCallback(
    async (search?: string) => {
      try {
        setLoading(true)
        const fetchedSkills = await fetchSkillsWithFilters(search ?? '', 0, SKILLS_DROPDOWN_LIMIT)
        setSkills(fetchedSkills)
      } catch (error) {
        console.error('[useChatConfigSkills] Error fetching skills:', error)
        setSkills([])
      } finally {
        setLoading(false)
      }
    },
    [setSkills, setLoading]
  )

  const searchSkills = useCallback(
    (query: string) => {
      debouncedFetch(() => fetchSkillsWithFilters(query, 0, SKILLS_DROPDOWN_LIMIT))
    },
    [debouncedFetch]
  )

  const initialLoad = useCallback(async () => {
    if (loadedRef.current) return
    loadedRef.current = true
    await fetchSkills()
  }, [fetchSkills])

  const reset = useCallback(() => {
    immediateReset()
    loadedRef.current = false
  }, [immediateReset])

  return {
    skills,
    loading,
    searchSkills,
    initialLoad,
    reset,
  }
}
