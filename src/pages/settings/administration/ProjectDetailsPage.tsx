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

import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import { ButtonSize } from '@/constants'
import { useFeatureFlag } from '@/hooks/useFeatureFlags'
import { useVueRouter } from '@/hooks/useVueRouter'
import ProjectModal, {
  ProjectFormData,
} from '@/pages/settings/administration/projectsManagement/ProjectModal'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import SpendingTable from '@/pages/settings/components/SpendingTable'
import { projectsStore } from '@/store/projects'
import { userStore } from '@/store/user'
import { ProjectType } from '@/types/entity/project'
import { ProjectDetail } from '@/types/entity/projectManagement'
import toaster from '@/utils/toaster'
import { displayValue, formatDate } from '@/utils/utils'

import ProjectMembersManager from './projectsManagement/ProjectMembersManager'

const FEATURE_FLAG_COST_CENTERS = 'features:costCenters'

const formatCurrency = (value: number | null | undefined) =>
  value == null ? '-' : `$${value.toFixed(2)}`

const ProjectDetailsPage = () => {
  const router = useVueRouter()
  const { user: currentUser } = useSnapshot(userStore)
  const projectName = router.params.projectName as string
  const [isCostCentersEnabled] = useFeatureFlag(FEATURE_FLAG_COST_CENTERS)
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditPopupVisible, setIsEditPopupVisible] = useState(false)

  const isPersonalProject = project?.project_type === ProjectType.PERSONAL
  const canManageProject =
    !isPersonalProject &&
    ((currentUser?.isAdmin ?? false) ||
      (currentUser?.applicationsAdmin?.includes(project?.name ?? '') ?? false))

  const loadProject = useCallback(async () => {
    setLoading(true)
    try {
      const data = await projectsStore.getProject(projectName, true)
      setProject(data)
    } catch (error) {
      console.error('Failed to load project:', error)
      setProject(null)
    } finally {
      setLoading(false)
    }
  }, [projectName])

  useEffect(() => {
    loadProject()
  }, [loadProject])

  const handleBack = useCallback(() => {
    router.push({ name: 'projects-management' })
  }, [router])

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
        description: payload.description,
        cost_center_id: payload.cost_center_id,
        clear_cost_center: payload.clear_cost_center,
      })
      toaster.info(`Project ${payload.name} updated successfully`)
      setIsEditPopupVisible(false)

      if (updatedProject.name !== project.name) {
        router.push({
          name: 'projects-management-detail',
          params: { projectName: payload.name },
        })
      } else {
        await loadProject()
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
        contentTitle={project.name}
        onBack={handleBack}
        rightContent={
          canManageProject ? (
            <Button size={ButtonSize.MEDIUM} onClick={() => setIsEditPopupVisible(true)}>
              Edit Project
            </Button>
          ) : null
        }
        content={
          <div className="flex flex-col gap-6 pt-6 pb-8">
            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
                <div className="text-xs text-text-quaternary mb-2">Description</div>
                <div className="text-sm text-text-primary whitespace-pre-wrap">
                  {displayValue(project.description)}
                </div>
              </div>

              <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Total Users</div>
                    <div>{project.user_count}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Admins</div>
                    <div>{project.admin_count}</div>
                  </div>
                  {project.spending && (
                    <>
                      <div>
                        <div className="text-xs text-text-quaternary mb-1">Budget Period Spend</div>
                        <div>{formatCurrency(project.spending.current_spending)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-text-quaternary mb-1">Lifetime Spend</div>
                        <div>
                          {formatCurrency(
                            project.spending.cumulative_spend ?? project.spending.current_spending
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {isCostCentersEnabled && (
                    <div>
                      <div className="text-xs text-text-quaternary mb-1">Cost center</div>
                      {project.cost_center_id && project.cost_center_name ? (
                        <button
                          type="button"
                          className="text-text-accent-status hover:text-text-accent-status-hover"
                          onClick={handleCostCenterOpen}
                        >
                          {project.cost_center_name}
                        </button>
                      ) : (
                        <div>-</div>
                      )}
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Type</div>
                    <div className="capitalize">{project.project_type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Created by</div>
                    <div>{displayValue(project.created_by)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-quaternary mb-1">Created at</div>
                    <div>{formatDate(project.created_at)}</div>
                  </div>
                </div>
              </div>
            </section>

            {project.spending_widget && project.spending_widget.data.rows.length > 0 && (
              <section>
                <div className="rounded-lg border border-border-structural bg-surface-base-secondary p-4">
                  <div className="text-sm font-medium text-text-primary mb-4">Project spending</div>
                  <SpendingTable
                    columns={project.spending_widget.data.columns}
                    rows={project.spending_widget.data.rows as unknown as Record<string, unknown>[]}
                  />
                </div>
              </section>
            )}

            {!isPersonalProject && (
              <section>
                <ProjectMembersManager project={project} onMembersChanged={loadProject} />
              </section>
            )}
          </div>
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
