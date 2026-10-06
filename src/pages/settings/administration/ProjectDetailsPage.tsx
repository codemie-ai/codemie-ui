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

import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { ButtonSize } from '@/constants'
import { FEATURE_FLAGS } from '@/constants/featureFlags'
import { PROJECTS_MANAGEMENT_DETAIL } from '@/constants/routes'
import {
  useFeatureFlag,
  useBudgetManagementEnabled,
  useProjectChargebackEnabled,
} from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import ProjectModal, {
  ProjectFormData,
} from '@/pages/settings/administration/projectsManagement/ProjectModal'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { projectBudgetsStore } from '@/store/projectBudgets'
import { projectDisplayNamesStore } from '@/store/projectDisplayNames'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { ProjectType } from '@/types/entity/project'
import { ProjectBudget } from '@/types/entity/projectBudget'
import { ProjectDetail } from '@/types/entity/projectManagement'
import { getProjectDisplayName } from '@/utils/projectDisplayName'
import toaster from '@/utils/toaster'

import ProjectBudgetsSection, {
  ProjectBudgetsAccess,
} from './projectsManagement/ProjectBudgetsSection'
import ProjectDetailsNavigation, {
  getProjectDetailsTab,
  ProjectDetailsTab,
} from './projectsManagement/ProjectDetailsNavigation'
import ProjectIntegrationsSection from './projectsManagement/ProjectIntegrationsSection'
import ProjectMembersManager from './projectsManagement/ProjectMembersManager'
import ProjectModelsSection from './projectsManagement/ProjectModelsSection'
import ProjectOverviewSection from './projectsManagement/ProjectOverviewSection'
import { goBackProjectDetails } from './utils/goBackAdministration'

/** Tabs a viewer can open; each section enforces its own finer-grained actions. */
const getVisibleTabs = ({
  isPersonalProject,
  canManageProject,
  canViewBudgets,
  isModelsConfigEnabled,
}: {
  isPersonalProject: boolean
  canManageProject: boolean
  canViewBudgets: boolean
  isModelsConfigEnabled: boolean
}): ProjectDetailsTab[] => [
  'overview',
  ...(isPersonalProject ? [] : (['members'] as const)),
  ...(canManageProject && isModelsConfigEnabled ? (['models'] as const) : []),
  ...(canViewBudgets ? (['budgets'] as const) : []),
  ...(canManageProject ? (['integrations'] as const) : []),
]

const resolveBudgetsAccess = ({
  isMaintainer,
  isAdmin,
  isProjectAdmin,
}: {
  isMaintainer: boolean
  isAdmin: boolean
  isProjectAdmin: boolean
}): ProjectBudgetsAccess => {
  if (isMaintainer) return 'full'
  if (isAdmin || isProjectAdmin) return 'distribution'
  return 'view'
}

const ProjectDetailsPage = () => {
  const router = useVueRouter()
  const { user: currentUser } = useSnapshot(userStore)
  const projectName = router.params.projectName as string
  const activeTab = getProjectDetailsTab(router.name)
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAGS.COST_CENTERS)
  const [isChargebackFeatureEnabled] = useProjectChargebackEnabled()
  const [isBudgetManagementEnabled] = useBudgetManagementEnabled()
  const [isModelsConfigEnabled] = useFeatureFlag(FEATURE_FLAGS.PROJECT_MODEL_OVERRIDE)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false)
  const [budgets, setBudgets] = useState<ProjectBudget[]>([])

  const isPersonalProject = project?.project_type === ProjectType.PERSONAL
  const isAdmin = currentUser?.isAdmin ?? false
  const isMaintainer = currentUser?.isMaintainer ?? false
  const isAuditor = currentUser?.isAuditor ?? false
  const isProjectAdmin = currentUser?.applicationsAdmin?.includes(project?.name ?? '') ?? false
  const canManageProject = !isPersonalProject && (isAdmin || isProjectAdmin)
  const canViewBudgets =
    isBudgetManagementEnabled &&
    !isPersonalProject &&
    (isAdmin || isMaintainer || isAuditor || isProjectAdmin)
  // Maintainers get full budget control; admins and project admins keep the reduced
  // "distribution" capability (redistribute an existing budget's member split, EPMCDME-13962)
  // instead of losing budget management entirely — resolveBudgetsAccess is the single source
  // for this tier, used identically on Overview and the Budgets tab.
  const budgetsAccess: ProjectBudgetsAccess = isBudgetManagementEnabled
    ? resolveBudgetsAccess({ isMaintainer, isAdmin, isProjectAdmin })
    : 'view'
  const visibleTabs = getVisibleTabs({
    isPersonalProject,
    canManageProject,
    canViewBudgets,
    isModelsConfigEnabled,
  })
  const canOpenActiveTab = visibleTabs.includes(activeTab)

  // `guard` is only set by the mount/projectName-change effect below, so a manual refresh call
  // (e.g. after saving the project or a members/budgets change) always applies its result.
  const loadProject = useCallback(
    async (guard?: { cancelled: boolean }) => {
      setLoading(true)
      try {
        const data = await projectsStore.getProject(projectName, true)
        if (!guard?.cancelled) setProject(data)
      } catch (error) {
        console.error('Failed to load project:', error)
        if (!guard?.cancelled) setProject(null)
      } finally {
        if (!guard?.cancelled) setLoading(false)
      }
    },
    [projectName]
  )

  useEffect(() => {
    const guard = { cancelled: false }
    loadProject(guard)
    return () => {
      guard.cancelled = true
    }
  }, [loadProject])

  useEffect(() => {
    let cancelled = false
    if (activeTab !== 'members' || !canViewBudgets || !projectName) {
      return () => {
        cancelled = true
      }
    }
    projectBudgetsStore
      .listProjectBudgets({ projectName })
      .then((data) => {
        if (!cancelled) setBudgets(data)
      })
      .catch((error) => console.error('Failed to load project budgets for members:', error))
    return () => {
      cancelled = true
    }
  }, [activeTab, canViewBudgets, projectName])

  const handleBack = useCallback(() => {
    goBackProjectDetails()
  }, [])

  const handleCostCenterOpen = useCallback(() => {
    if (!project?.cost_center_id) return

    router.push({
      name: 'cost-centers-management-detail',
      params: { costCenterId: project.cost_center_id },
    })
  }, [project?.cost_center_id, router])

  const handleSaveProject = async (payload: ProjectFormData) => {
    if (!project) return

    try {
      const updatedProject = await projectsStore.updateProject(project.name, {
        name: payload.name,
        display_name: payload.display_name,
        clear_display_name: payload.clear_display_name,
        description: payload.description,
        cost_center_id: payload.cost_center_id,
        clear_cost_center: payload.clear_cost_center,
        enforce_member_spend_limits: payload.enforce_member_spend_limits,
        chargeback_attribution: payload.chargeback_attribution,
      })
      toaster.info(`Project ${updatedProject.name} updated successfully`)
      setIsEditPopupVisible(false)

      projectDisplayNamesStore.invalidate(project.name)
      projectDisplayNamesStore.invalidate(updatedProject.name)
      await userStore.getCurrentUser()

      if (updatedProject.name !== project.name) {
        router.push({
          name: PROJECTS_MANAGEMENT_DETAIL,
          params: { projectName: updatedProject.name },
        })
      } else {
        await loadProject().catch((error) => console.error('Failed to reload project', error))
      }
    } catch (error: any) {
      const errorMessage =
        error?.parsedError?.message || error?.message || 'Failed to update project'
      toaster.error(errorMessage)
      throw error
    }
  }

  if (loading) {
    return (
      <SettingsLayout
        contentTitle="Project details"
        onBack={handleBack}
        content={
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        }
      />
    )
  }

  if (!project) {
    return (
      <SettingsLayout
        contentTitle="Project details"
        onBack={handleBack}
        content={<div className="pt-6 text-text-quaternary">Project not found</div>}
      />
    )
  }

  return (
    <>
      <SettingsLayout
        contentTitle={getProjectDisplayName(project)}
        onBack={handleBack}
        rightContent={
          canManageProject ? (
            <Button size={ButtonSize.MEDIUM} onClick={() => setIsEditPopupVisible(true)}>
              Edit Project
            </Button>
          ) : null
        }
        content={
          <>
            <ProjectDetailsNavigation
              projectName={project.name}
              activeTab={activeTab}
              visibleTabs={visibleTabs}
            />
            {activeTab === 'overview' && (
              <ProjectOverviewSection
                project={project}
                onCostCenterOpen={handleCostCenterOpen}
                budgetsAccess={budgetsAccess}
                isChargebackFeatureEnabled={isChargebackFeatureEnabled}
                costCentersEnabled={isCostCentersEnabled}
                canViewBudgets={canViewBudgets}
                canManageProject={canManageProject}
                isModelsConfigEnabled={isModelsConfigEnabled}
                spendingRows={canViewBudgets ? project.spending_widget?.data?.rows : undefined}
                onProjectChanged={loadProject}
              />
            )}
            {activeTab === 'models' && canOpenActiveTab && (
              <ProjectModelsSection projectName={project.name} />
            )}
            {activeTab === 'integrations' && canOpenActiveTab && (
              <ProjectIntegrationsSection projectName={project.name} />
            )}
            {activeTab === 'members' && canOpenActiveTab && (
              <div className="pt-5 pb-8">
                <ProjectMembersManager
                  project={project}
                  onMembersChanged={loadProject}
                  budgets={isMaintainer || isProjectAdmin ? budgets : undefined}
                  onBudgetsChanged={isMaintainer || isProjectAdmin ? setBudgets : undefined}
                  // Per-member model overrides have no backend support yet (EPMCDME-14349
                  // scoped the FE to the flat project-level allow-list); keep this entry
                  // point hidden regardless of the Models tab's own feature flag.
                  isModelsConfigEnabled={false}
                />
              </div>
            )}
            {activeTab === 'budgets' && canOpenActiveTab && (
              <div className="pt-5 pb-8">
                <ProjectBudgetsSection
                  projectName={project.name}
                  project={project}
                  access={budgetsAccess}
                  onProjectChanged={loadProject}
                  spendingRows={project.spending_widget?.data?.rows}
                  onBudgetsChanged={isMaintainer || isProjectAdmin ? setBudgets : undefined}
                  spending={project.spending}
                />
              </div>
            )}
            {!canOpenActiveTab && (
              <div className="pt-6 text-sm text-text-quaternary">
                {isPersonalProject
                  ? 'This section is not available for personal projects.'
                  : 'You do not have access to this section.'}
              </div>
            )}
          </>
        }
      />

      <ProjectModal
        visible={isEditPopupVisible}
        project={project}
        onHide={() => setIsEditPopupVisible(false)}
        onSubmit={handleSaveProject}
      />
    </>
  )
}

export default ProjectDetailsPage
