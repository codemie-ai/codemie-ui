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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import SearchSvg from '@/assets/icons/search.svg?react'
import Button from '@/components/Button'
import Pagination from '@/components/Pagination'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { MAX_SKILLS_PER_ASSISTANT } from '@/constants/skills'
import { Skill } from '@/types/entity/skill'

import SkillSelectorList from './SkillSelectorList'
import { useChatSkillsSelector } from '../../hooks/useChatSkillsSelector'
import { SkillOption } from '../ChatConfiguration/ChatConfigSkillsSelector'

interface ChatSkillsSelectorProps {
  visible: boolean
  onClose: () => void
  selectedSkills: SkillOption[]
  onConfirm: (skills: SkillOption[]) => void
}

const ChatSkillsSelector: React.FC<ChatSkillsSelectorProps> = ({
  visible,
  onClose,
  selectedSkills,
  onConfirm,
}) => {
  const {
    skills,
    loading,
    pagination,
    currentPage,
    searchQuery,
    setSearchQuery,
    setPage,
    reset,
    initialLoad,
  } = useChatSkillsSelector()

  const [localSelectedSkills, setLocalSelectedSkills] = useState<SkillOption[]>(selectedSkills)
  const [maxSkillsError, setMaxSkillsError] = useState('')
  // Store selected skills data to preserve them even if they're not in current search results
  const [selectedSkillsCache, setSelectedSkillsCache] = useState<Map<string, Skill>>(new Map())
  // Capture initial selection when modal opens to avoid re-sorting on every selection change
  const [initialSelectedSkills, setInitialSelectedSkills] = useState<SkillOption[]>(selectedSkills)

  // Track previous visible state to detect when modal opens
  const prevVisibleRef = useRef(false)

  // Reset local state and load skills when modal opens
  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current
    prevVisibleRef.current = visible

    if (isOpening) {
      setLocalSelectedSkills(selectedSkills)
      setInitialSelectedSkills(selectedSkills)
      setMaxSkillsError('')
      reset()
      initialLoad()
    }
  }, [visible, selectedSkills, reset, initialLoad])

  // Cache selected skills data when they appear in results
  useEffect(() => {
    setSelectedSkillsCache((prevCache) => {
      const newCache = new Map(prevCache)
      const selectedIds = localSelectedSkills.map((s) => s.value)
      skills.forEach((skill) => {
        if (selectedIds.includes(skill.id)) {
          newCache.set(skill.id, skill)
        }
      })
      return newCache
    })
  }, [skills, localSelectedSkills])

  // Combine skills from API with cached selected skills that might not be in current search
  const displaySkills = useMemo(() => {
    const seenIds = new Set<string>()
    const result: Skill[] = []

    // 1. Initially selected skills first (already selected by user)
    initialSelectedSkills.forEach((skillOption) => {
      const skill =
        skills.find((s) => s.id === skillOption.value) || selectedSkillsCache.get(skillOption.value)
      if (skill && !seenIds.has(skill.id)) {
        result.push(skill)
        seenIds.add(skill.id)
      }
    })

    // 2. Skills from API in server order (relevance-sorted by backend)
    skills.forEach((skill) => {
      if (!seenIds.has(skill.id)) {
        result.push(skill)
        seenIds.add(skill.id)
      }
    })

    // 3. Cached selected skills not in current results
    localSelectedSkills.forEach((skillOption) => {
      if (!seenIds.has(skillOption.value) && selectedSkillsCache.has(skillOption.value)) {
        const skill = selectedSkillsCache.get(skillOption.value)!
        result.push(skill)
        seenIds.add(skill.id)
      }
    })

    return result
  }, [skills, localSelectedSkills, selectedSkillsCache, initialSelectedSkills])

  const handleToggleSkill = useCallback(
    (skillId: string) => {
      setLocalSelectedSkills((prev) => {
        const isSelected = prev.some((s) => s.value === skillId)
        if (isSelected) {
          setMaxSkillsError('')
          return prev.filter((s) => s.value !== skillId)
        }
        if (prev.length >= MAX_SKILLS_PER_ASSISTANT) {
          setMaxSkillsError(`You can select maximum ${MAX_SKILLS_PER_ASSISTANT} skills`)
          return prev
        }
        const skill = skills.find((s) => s.id === skillId)
        if (!skill) return prev
        setMaxSkillsError('')
        return [
          ...prev,
          {
            value: skill.id,
            label: skill.name,
            description: skill.description,
          },
        ]
      })
    },
    [skills]
  )

  const handleClearAll = useCallback(() => {
    setLocalSelectedSkills([])
    setMaxSkillsError('')
    setSearchQuery('')
  }, [setSearchQuery])

  const handleConfirm = useCallback(() => {
    onConfirm(localSelectedSkills)
    onClose()
  }, [localSelectedSkills, onConfirm, onClose])

  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page)
    },
    [setPage]
  )

  const footerContent = (
    <div className="flex items-center justify-between w-full">
      <Button
        variant={ButtonType.TERTIARY}
        onClick={handleClearAll}
        disabled={localSelectedSkills.length === 0}
      >
        Clear All
      </Button>
      <div className="flex gap-3">
        <Button variant={ButtonType.BASE} onClick={handleClose}>
          Cancel
        </Button>
        <Button variant={ButtonType.PRIMARY} onClick={handleConfirm}>
          Confirm ({localSelectedSkills.length})
        </Button>
      </div>
    </div>
  )

  return (
    <Popup
      className="w-full max-w-2xl"
      hideClose
      header="Attach Skills"
      visible={visible}
      onHide={handleClose}
      withBorder
      footerContent={footerContent}
    >
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">
          Select skills to enhance assistant capabilities for this conversation.
        </p>

        {/* Search Input */}
        <div className="relative">
          <SearchSvg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-surface-elevated border border-border-primary rounded-lg focus:outline-none focus:border-border-active placeholder:text-text-tertiary"
          />
        </div>

        {/* Error message */}
        {maxSkillsError && <p className="text-sm text-failed-secondary">{maxSkillsError}</p>}

        {/* Skills List */}
        <SkillSelectorList
          skills={displaySkills}
          selectedIds={localSelectedSkills.map((s) => s.value)}
          onToggle={handleToggleSkill}
          loading={loading}
        />

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <Pagination
            className="mt-2 pt-3 bg-transparent !bg-none border-t border-border-primary"
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            setPage={handlePageChange}
            responsive
          />
        )}
      </div>
    </Popup>
  )
}

ChatSkillsSelector.displayName = 'ChatSkillsSelector'

export default ChatSkillsSelector
