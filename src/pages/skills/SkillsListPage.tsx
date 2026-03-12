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

import React, { useEffect, useState, useCallback, useMemo } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Pagination from '@/components/Pagination'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { ButtonSize } from '@/constants'
import { NEW_SKILL, SKILL_DETAILS } from '@/constants/routes'
import { SKILL_INDEX_SCOPES } from '@/constants/skills'
import { useSidebarOffsetClass } from '@/hooks/useSidebarOffsetClass'
import { useVueRouter } from '@/hooks/useVueRouter'
import { useSkills } from '@/pages/skills/hooks/useSkills'
import { useSkillsFilters } from '@/pages/skills/hooks/useSkillsFilters'
import { downloadSkillAsMarkdown } from '@/pages/skills/utils/skillUtils'
import { skillsStore } from '@/store/skills'
import { Skill, SkillsFilters, SkillVisibility } from '@/types/entity/skill'
import { cn } from '@/utils/utils'

import SkillsFiltersComponent from './components/SkillsFilters'
import SkillsGrid from './components/SkillsGrid'
import SkillsNavigation, { SkillTab } from './components/SkillsNavigation'

// Map tab to API scope - defined outside component to avoid recreation
const SCOPE_BY_TAB = {
  [SkillTab.PROJECT]: SKILL_INDEX_SCOPES.PROJECT,
  [SkillTab.MARKETPLACE]: SKILL_INDEX_SCOPES.MARKETPLACE,
} as const

interface SkillsListPageProps {
  tab?: SkillTab
}

const SkillsListPage: React.FC<SkillsListPageProps> = ({ tab = SkillTab.PROJECT }) => {
  const router = useVueRouter()
  const [currentPage, setCurrentPage] = useState(0)

  const activeScope = SCOPE_BY_TAB[tab] ?? SKILL_INDEX_SCOPES.PROJECT

  const { filters, handleFilterChange } = useSkillsFilters({ scope: activeScope })

  // Compute activeFilters by adding scope and visibility based on tab
  const activeFilters = useMemo((): SkillsFilters => {
    const baseFilters: SkillsFilters = {
      ...filters,
      scope: activeScope,
    }

    // For PROJECT tab, set default visibility if not explicitly selected
    if (tab === SkillTab.PROJECT && filters.visibility === undefined) {
      baseFilters.visibility = SkillVisibility.PROJECT
    }

    // For MARKETPLACE tab, only show PUBLIC visibility
    if (tab === SkillTab.MARKETPLACE) {
      baseFilters.visibility = SkillVisibility.PUBLIC
    }

    return baseFilters
  }, [filters, activeScope, tab])

  const { skills, loading, pagination, refresh } = useSkills(activeFilters, currentPage)

  const handleViewSkill = (skill: Skill) => {
    router.push({ name: SKILL_DETAILS, params: { id: skill.id } })
  }

  const handleExportSkill = async (skill: Skill) => {
    try {
      const blob = await skillsStore.exportSkill(skill.id)
      const content = await blob.text()
      downloadSkillAsMarkdown(skill, content)
    } catch (err) {
      console.error('Error exporting skill:', err)
    }
  }

  const handleCreateSkill = React.useCallback(() => {
    router.push({ name: NEW_SKILL })
  }, [router])

  const onFilterChange = useCallback(
    (newFilters: Record<string, unknown>) => {
      handleFilterChange(newFilters)
      setCurrentPage(0)
    },
    [handleFilterChange]
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(0)
  }, [tab])

  const headerActions = React.useMemo(
    () => (
      <Button type="primary" onClick={handleCreateSkill} size={ButtonSize.MEDIUM}>
        <PlusIcon />
        Create Skill
      </Button>
    ),
    [handleCreateSkill]
  )

  const paginationOffset = useSidebarOffsetClass()

  return (
    <div className="flex h-full">
      <Sidebar
        title="Skills"
        description="Create and manage reusable knowledge for your assistants"
      >
        <SkillsNavigation activeTabID={tab} />
        <SkillsFiltersComponent
          onFilterChange={onFilterChange}
          filters={filters}
          activeScope={activeScope}
        />
      </Sidebar>

      <PageLayout rightContent={headerActions}>
        {loading && skills.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : (
          <>
            <SkillsGrid
              skills={skills}
              totalCount={pagination.totalCount}
              onViewSkill={handleViewSkill}
              onExportSkill={handleExportSkill}
              reloadSkills={refresh}
              isMarketplace={tab === SkillTab.MARKETPLACE}
            />

            {skills.length > 0 && pagination.totalPages > 1 && (
              <Pagination
                className={cn(
                  'z-10 mt-6 fixed bottom-0 right-0 bg-surface-base-primary duration-150 px-6 pt-5 pb-3.5',
                  paginationOffset
                )}
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                setPage={handlePageChange}
                perPage={pagination.perPage}
              />
            )}
          </>
        )}
      </PageLayout>
    </div>
  )
}

export default SkillsListPage
