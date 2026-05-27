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

import React, { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { SKILL_INDEX_SCOPES } from '@/constants/skills'
import AssistantActions from '@/pages/assistants/AssistantActions/AssistantActions'
import AssistantCard from '@/pages/assistants/components/AssistantList/AssistantCard'
import AssistantFilters from '@/pages/assistants/components/AssistantList/AssistantFilters'
import { useAssistantFilters } from '@/pages/assistants/hooks/useAssistantFilters'
import SkillCard from '@/pages/skills/components/SkillCard'
import SkillsFiltersComponent from '@/pages/skills/components/SkillsFilters'
import { useSkillsFilters } from '@/pages/skills/hooks/useSkillsFilters'
import WorkflowCard, { Workflow } from '@/pages/workflows/components/WorkflowCard'
import WorkflowsFilters from '@/pages/workflows/components/WorkflowsFilters'
import { WORKFLOW_LIST_SCOPE } from '@/pages/workflows/constants'
import { favoritesStore } from '@/store/favorites'
import { Assistant } from '@/types/entity/assistant'
import { FavoriteFilter, FavoriteItem, FavoritesFilters } from '@/types/entity/favorites'
import { Skill } from '@/types/entity/skill'
import { FILTER_ENTITY, getFilters, setFilters } from '@/utils/filters'

import FavoritesAllFilters from './components/FavoritesAllFilters'
import FavoritesNavigation from './components/FavoritesNavigation/FavoritesNavigation'
import { useFavoritesNavigation } from './hooks/useFavoritesNavigation'

interface FavoritesPageProps {
  filter: FavoriteFilter
}

const GRID_CLASS =
  'min-w-80 grid auto-rows-min grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3 gap-2.5 justify-items-center'

const SECTION_TITLE_CLASS = 'flex-row px-1 w-full text-xs text-quaternary font-semibold mb-4'

const FavoritesPage: React.FC<FavoritesPageProps> = ({ filter }) => {
  const { favorites, assistants, skills, workflows, loading } = useSnapshot(favoritesStore)

  const { handleViewAssistant, handleViewSkill, handleExportSkill } = useFavoritesNavigation()

  const { filters: assistantFilters, handleFilterChange: handleAssistantFilterChange } =
    useAssistantFilters({ scope: ASSISTANT_INDEX_SCOPES.FAVORITES })

  const { filters: skillFilters, handleFilterChange: handleSkillFilterChange } = useSkillsFilters({
    scope: SKILL_INDEX_SCOPES.FAVORITES,
  })

  const [workflowFilters, setWorkflowFilters] = useState<Record<string, unknown>>(() =>
    getFilters<Record<string, unknown>>(
      `${FILTER_ENTITY.WORKFLOWS}.${WORKFLOW_LIST_SCOPE.FAVORITES}`
    )
  )

  const handleWorkflowFilterChange = useCallback((filters: Record<string, unknown>) => {
    setFilters(`${FILTER_ENTITY.WORKFLOWS}.${WORKFLOW_LIST_SCOPE.FAVORITES}`, filters)
    setWorkflowFilters(filters)
  }, [])
  const [allFilters, setAllFilters] = useState<Partial<FavoritesFilters>>(() =>
    getFilters<Partial<FavoritesFilters>>('favorites.all')
  )

  useEffect(() => {
    if (filter === 'all') {
      favoritesStore.fetchFavorites(allFilters)
    } else if (filter === 'assistant') {
      favoritesStore.fetchFavoriteAssistants(assistantFilters)
    } else if (filter === 'skill') {
      favoritesStore.fetchFavoriteSkills(skillFilters)
    } else if (filter === 'workflow') {
      favoritesStore.fetchFavoriteWorkflows(workflowFilters)
    }
  }, [
    filter,
    JSON.stringify(allFilters),
    JSON.stringify(assistantFilters),
    JSON.stringify(skillFilters),
    JSON.stringify(workflowFilters),
  ])

  const handleRefresh = useCallback(() => {
    if (filter === 'all') favoritesStore.fetchFavorites(allFilters)
    else if (filter === 'assistant') favoritesStore.fetchFavoriteAssistants(assistantFilters)
    else if (filter === 'skill') favoritesStore.fetchFavoriteSkills(skillFilters)
    else if (filter === 'workflow') favoritesStore.fetchFavoriteWorkflows(workflowFilters)
  }, [filter, allFilters, assistantFilters, skillFilters, workflowFilters])

  const renderAssistantGrid = (items: readonly FavoriteItem[]) => (
    <div className={GRID_CLASS}>
      {items.map((item) => {
        const assistant = item as unknown as Assistant
        return (
          <AssistantCard
            key={item.id}
            assistant={assistant}
            onViewAssistant={handleViewAssistant}
            navigation={
              <AssistantActions
                assistant={assistant}
                onView={handleViewAssistant}
                reloadAssistants={handleRefresh}
              />
            }
          />
        )
      })}
    </div>
  )

  const renderSkillGrid = (items: readonly FavoriteItem[]) => (
    <div className={GRID_CLASS}>
      {items.map((item) => (
        <SkillCard
          key={item.id}
          skill={item as unknown as Skill}
          onView={() => handleViewSkill(item as unknown as Skill)}
          onExport={() => handleExportSkill(item as unknown as Skill)}
          reloadSkills={handleRefresh}
        />
      ))}
    </div>
  )

  const renderWorkflowGrid = (items: readonly FavoriteItem[]) => (
    <div className={GRID_CLASS}>
      {items.map((item) => (
        <WorkflowCard
          key={item.id}
          workflow={item as unknown as Workflow}
          reloadWorkflows={handleRefresh}
        />
      ))}
    </div>
  )

  const renderSidebarFilters = () => {
    if (filter === 'all') return <FavoritesAllFilters onFilterChange={setAllFilters} />
    if (filter === 'assistant') {
      return (
        <AssistantFilters
          filters={assistantFilters}
          onFilterChange={handleAssistantFilterChange}
          activeScope={ASSISTANT_INDEX_SCOPES.FAVORITES}
        />
      )
    }
    if (filter === 'workflow') {
      return (
        <WorkflowsFilters
          scope={WORKFLOW_LIST_SCOPE.FAVORITES}
          onApply={handleWorkflowFilterChange}
        />
      )
    }
    if (filter === 'skill') {
      return (
        <SkillsFiltersComponent
          filters={skillFilters}
          onFilterChange={handleSkillFilterChange}
          activeScope={SKILL_INDEX_SCOPES.FAVORITES}
        />
      )
    }
    return null
  }

  const renderContent = () => {
    if (loading) {
      return <Spinner inline rootClassName="py-12" />
    }

    if (filter === 'all') {
      const hasAny = assistants.length > 0 || skills.length > 0 || workflows.length > 0
      if (!hasAny) {
        return <p className="text-sm text-text-quaternary mt-8 text-center">No favorites found.</p>
      }
      return (
        <>
          {assistants.length > 0 && (
            <div className="mb-8">
              <div className={SECTION_TITLE_CLASS}>ASSISTANTS</div>
              {renderAssistantGrid(assistants)}
            </div>
          )}
          {skills.length > 0 && (
            <div className="mb-8">
              <div className={SECTION_TITLE_CLASS}>SKILLS</div>
              {renderSkillGrid(skills)}
            </div>
          )}
          {workflows.length > 0 && (
            <div className="mb-8">
              <div className={SECTION_TITLE_CLASS}>WORKFLOWS</div>
              {renderWorkflowGrid(workflows)}
            </div>
          )}
        </>
      )
    }

    if (filter === 'assistant') {
      if (assistants.length === 0)
        return <p className="text-sm text-text-quaternary mt-8 text-center">No favorites found.</p>
      return renderAssistantGrid(assistants)
    }

    if (filter === 'skill') {
      if (skills.length === 0)
        return <p className="text-sm text-text-quaternary mt-8 text-center">No favorites found.</p>
      return renderSkillGrid(skills)
    }

    if (filter === 'workflow') {
      if (workflows.length === 0)
        return <p className="text-sm text-text-quaternary mt-8 text-center">No favorites found.</p>
      return renderWorkflowGrid(workflows)
    }

    if (favorites.length === 0)
      return <p className="text-sm text-text-quaternary mt-8 text-center">No favorites found.</p>

    return null
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Favorites" description="Browse your saved favorites">
        <FavoritesNavigation activeFilter={filter} />
        {renderSidebarFilters()}
      </Sidebar>
      <PageLayout renderHeader={<div />}>
        <div className="min-h-full flex flex-col pb-24 pt-6">{renderContent()}</div>
      </PageLayout>
    </div>
  )
}

export default FavoritesPage
