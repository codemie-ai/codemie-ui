// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, ReactNode, useCallback, useEffect, useState } from 'react'

import IconDelete from '@/assets/icons/delete.svg?react'
import IconEdit from '@/assets/icons/edit.svg?react'
import Plus from '@/assets/icons/plus-filled.svg?react'
import Button from '@/components/Button'
import NavigationMore from '@/components/NavigationMore'
import Spinner from '@/components/Spinner'
import Table from '@/components/Table'
import { ButtonSize } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { renderIntegrationStateCell } from '@/pages/integrations/components/IntegrationStateBadge/renderIntegrationStateCell'
import TestIntegration from '@/pages/integrations/components/TestIntegration'
import { projectSettingsStore } from '@/store/projectSettings'
import { ProjectSetting } from '@/types/entity/setting'
import { ColumnDefinition } from '@/types/table'
import { humanize } from '@/utils/helpers'
import { getSettingCredsURL, getTestableCredentialTypes } from '@/utils/settings'
import toaster from '@/utils/toaster'

interface Props {
  projectName: string
}

const columns: ColumnDefinition[] = [
  { label: 'Alias', key: 'alias', type: 'string', shrink: true },
  { label: 'Type', key: 'credential_type', type: 'custom' },
  { label: 'URL', key: 'credential_values', type: 'custom' },
  { label: 'State', key: 'is_enabled', type: 'custom' },
  { label: '', key: 'actions', type: 'custom' },
]

const renderActionsCell = (
  item: ProjectSetting,
  router: ReturnType<typeof useVueRouter>,
  onDelete: (item: ProjectSetting) => void
) => (
  <NavigationMore
    childrenFirst
    hideOnClickInside
    items={[
      {
        title: 'Edit',
        icon: <IconEdit />,
        onClick: () =>
          router.push({
            name: 'edit-project-integration',
            query: {
              project_name: item.project_name,
              credential_type: item.credential_type,
              alias: item.alias,
            },
          }),
      },
      {
        title: 'Delete',
        icon: <IconDelete />,
        onClick: () => onDelete(item),
      },
    ]}
  >
    {getTestableCredentialTypes().includes(item.credential_type.toLowerCase()) && (
      <TestIntegration
        label="Test"
        inline
        credentialType={item.credential_type}
        settingId={item.id}
        credentialValues={item.credential_values}
        testIcon="connection"
      />
    )}
  </NavigationMore>
)

const ProjectIntegrationsSection: FC<Props> = ({ projectName }) => {
  const router = useVueRouter()
  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<ProjectSetting[]>([])

  const loadIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const loadedIntegrations = await projectSettingsStore.listAllProjectSettings(projectName)
      setIntegrations(loadedIntegrations)
    } catch (error) {
      console.error('Failed to load project integrations:', error)
      setIntegrations([])
    } finally {
      setLoading(false)
    }
  }, [projectName])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  const handleDelete = async (item: ProjectSetting) => {
    try {
      await projectSettingsStore.deleteProjectSetting(item.id)
      toaster.info(`Integration ${item.alias} deleted successfully`)
      await loadIntegrations()
    } catch (error: any) {
      const errorMessage =
        error?.parsedError?.message || error?.message || 'Failed to delete integration'
      toaster.error(errorMessage)
    }
  }

  const customRenderColumns = {
    credential_type: (item: ProjectSetting) => humanize(item.credential_type),
    credential_values: (item: ProjectSetting) =>
      getSettingCredsURL(item.credential_values, item.credential_type.toLowerCase()),
    is_enabled: renderIntegrationStateCell,
    actions: (item: ProjectSetting) => renderActionsCell(item, router, handleDelete),
  }

  let integrationsContent: ReactNode
  if (loading) {
    integrationsContent = (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  } else if (integrations.length) {
    integrationsContent = (
      <Table
        items={integrations}
        columnDefinitions={columns}
        customRenderColumns={customRenderColumns}
      />
    )
  } else {
    integrationsContent = (
      <div className="rounded-lg border border-border-structural bg-surface-base-secondary px-6 py-12 text-center">
        <p className="text-sm text-text-primary">No project integrations configured</p>
        <p className="mt-2 text-xs text-text-quaternary">
          Project-level integrations will appear here when they are connected.
        </p>
      </div>
    )
  }

  return (
    <div className="pt-5 pb-8">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary">Project integrations</h2>
            <p className="mt-1 text-sm text-text-quaternary">
              Integrations configured for this project.
            </p>
          </div>
          <Button
            size={ButtonSize.MEDIUM}
            onClick={() =>
              router.push({
                name: 'new-project-integration',
                query: { project_name: projectName },
              })
            }
          >
            <Plus />
            Create Integration
          </Button>
        </div>
      </div>
      {integrationsContent}
    </div>
  )
}

export default ProjectIntegrationsSection
