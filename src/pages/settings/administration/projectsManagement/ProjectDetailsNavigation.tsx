// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC } from 'react'

import {
  PROJECTS_MANAGEMENT_BUDGETS,
  PROJECTS_MANAGEMENT_DETAIL,
  PROJECTS_MANAGEMENT_INTEGRATIONS,
  PROJECTS_MANAGEMENT_MEMBERS,
  PROJECTS_MANAGEMENT_MODELS,
  PROJECTS_MANAGEMENT_OVERVIEW,
} from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { cn } from '@/utils/utils'

export type ProjectDetailsTab = 'overview' | 'members' | 'models' | 'budgets' | 'integrations'

/**
 * Sections of the Project Details page. A new project-level area (e.g. MCP) is one entry
 * here, one route in router.tsx and one branch in ProjectDetailsPage.
 */
export const PROJECT_DETAILS_TABS: ReadonlyArray<{
  id: ProjectDetailsTab
  label: string
  route: string
}> = [
  { id: 'overview', label: 'Overview', route: PROJECTS_MANAGEMENT_DETAIL },
  { id: 'members', label: 'Members', route: PROJECTS_MANAGEMENT_MEMBERS },
  { id: 'models', label: 'Models', route: PROJECTS_MANAGEMENT_MODELS },
  { id: 'budgets', label: 'Budgets', route: PROJECTS_MANAGEMENT_BUDGETS },
  { id: 'integrations', label: 'Integrations', route: PROJECTS_MANAGEMENT_INTEGRATIONS },
]

const TAB_BY_ROUTE: Record<string, ProjectDetailsTab> = {
  [PROJECTS_MANAGEMENT_DETAIL]: 'overview',
  [PROJECTS_MANAGEMENT_OVERVIEW]: 'overview',
  [PROJECTS_MANAGEMENT_MEMBERS]: 'members',
  [PROJECTS_MANAGEMENT_MODELS]: 'models',
  [PROJECTS_MANAGEMENT_BUDGETS]: 'budgets',
  [PROJECTS_MANAGEMENT_INTEGRATIONS]: 'integrations',
}

export const getProjectDetailsTab = (routeName: string): ProjectDetailsTab =>
  TAB_BY_ROUTE[routeName] ?? 'overview'

interface Props {
  projectName: string
  activeTab: ProjectDetailsTab
  visibleTabs: ReadonlyArray<ProjectDetailsTab>
}

const ProjectDetailsNavigation: FC<Props> = ({ projectName, activeTab, visibleTabs }) => {
  const router = useVueRouter()
  const tabs = PROJECT_DETAILS_TABS.filter((tab) => visibleTabs.includes(tab.id))

  return (
    <nav
      aria-label="Project sections"
      className="sticky top-0 z-20 -mx-6 border-b border-border-structural bg-surface-base-primary px-6"
    >
      <div className="flex gap-1 overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                'relative shrink-0 px-3 py-3 text-sm transition-colors',
                isActive
                  ? 'text-text-primary font-medium after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-border-accent'
                  : 'text-text-quaternary hover:text-text-primary'
              )}
              onClick={() => router.push({ name: tab.route, params: { projectName } })}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default ProjectDetailsNavigation
