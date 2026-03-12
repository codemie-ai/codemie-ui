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

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSnapshot } from 'valtio'

import IconDelete from '@/assets/icons/delete.svg?react'
import IconEdit from '@/assets/icons/edit.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import Filters from '@/components/Filters'
import NavigationMore from '@/components/NavigationMore'
import Table from '@/components/Table'
import { TableProps } from '@/components/Table/Table'
import UserFilter from '@/components/UserFilter'
import { ButtonType, DECIMAL_PAGINATION_OPTIONS, CREATED_BY } from '@/constants'
import { useIntegrationTypeOptions } from '@/hooks/useIntegrationTypeOptions'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useVueRouter } from '@/hooks/useVueRouter'
import { INITIAL_FILTERS } from '@/pages/integrations/IntegrationsTab'
import { userStore } from '@/store'
import { projectSettingsStore } from '@/store/projectSettings'
import { ProjectSetting } from '@/types/entity'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { ColumnDefinition } from '@/types/table'
import { checkEmptyFilters, FILTER_ENTITY } from '@/utils/filters'
import { humanize, createdBy } from '@/utils/helpers'
import {
  getSettingCredsURL,
  SETTING_TYPE_PROJECT,
  getTestableCredentialTypes,
} from '@/utils/settings'
import toaster from '@/utils/toaster'

import IntegrationDeleteWarning from '../IntegrationDeleteWarning'
import TestIntegration from '../TestIntegration'

const REFRESH_TIMEOUT = 1000

interface Props {
  tableColumns: ColumnDefinition[]
  portalSidebarRef: React.RefObject<HTMLDivElement | null>
}

const ProjectSettings: FC<Props> = ({ tableColumns, portalSidebarRef }) => {
  const router = useVueRouter()
  const { projectSettings, projectSettingsPagination } = useSnapshot(projectSettingsStore)
  const [settingToDelete, setSettingToDelete] = useState<ProjectSetting | null>(null)
  const { projectOptions, loadProjectOptions } = useProjectOptions()
  const [createdByOptions, setCreatedByOptions] = useState<FilterOption[]>([])
  const [isCreatedByMeChecked, setIsCreatedByMeChecked] = useState(false)
  const { user } = useSnapshot(userStore) as typeof userStore

  const { onPaginationUpdate, pagination, filters, applyFilters } = useTableFilters({
    filterKey: FILTER_ENTITY.PROJECT_SETTINGS,
    initialPagination: { page: 0, perPage: projectSettingsPagination.perPage },
  })

  const loadCreatedByOptions = useCallback(async () => {
    try {
      const users = await userStore.loadProjectSettingsUsers()
      const options = users.map((user: any) => ({
        label: createdBy(user),
        value: user.name,
        id: user.username,
      }))
      setCreatedByOptions(options)
    } catch (error) {
      console.error('Error loading created by options:', error)
    }
  }, [])

  const editProjectSetting = (setting) => {
    router.push({
      name: 'edit-project-integration',
      query: {
        project_name: setting.project_name,
        credential_type: setting.credential_type,
        alias: setting.alias,
      },
    })
  }

  const deleteProjectSetting = () => {
    if (!settingToDelete) return

    projectSettingsStore.deleteProjectSetting(settingToDelete.id).then((resp) => {
      if (resp.error) {
        toaster.error(resp.error)
      }

      toaster.info('Integration deleted successfully')
      setTimeout(() => {
        projectSettingsStore.fetchProjectSettings(0, projectSettingsPagination.perPage, filters)
      }, REFRESH_TIMEOUT)
    })

    setSettingToDelete(null)
  }

  const typeOptions = useIntegrationTypeOptions({
    settingType: SETTING_TYPE_PROJECT,
    user,
    checkIfAdminOfAnyProject: true,
  })

  const filterDefinitions: FilterDefinition[] = [
    {
      name: 'project' as keyof typeof INITIAL_FILTERS,
      label: 'Project',
      type: FilterDefinitionType.Multiselect,
      value: filters['project' as keyof typeof INITIAL_FILTERS] || [],
      options: projectOptions,
      config: {
        maxSelectedLabels: 3,
        filter: true,
        filterPlaceholder: 'Search for projects',
        onFilter: loadProjectOptions,
      },
    },
    {
      name: CREATED_BY,
      label: 'Created by',
      type: FilterDefinitionType.Custom,
      value: filters['created_by' as keyof typeof INITIAL_FILTERS] || '',
      options: createdByOptions || [],
    },
    {
      name: 'type' as keyof typeof INITIAL_FILTERS,
      label: humanize('type' as keyof typeof INITIAL_FILTERS),
      type: FilterDefinitionType.Multiselect,
      value: filters['type' as keyof typeof INITIAL_FILTERS] || [],
      options: typeOptions,
      config: {
        filter: true,
        filterPlaceholder: 'Search for types',
        onFilter: () => {},
      },
    },
  ]

  const customTableColumns: TableProps<ProjectSetting>['customRenderColumns'] = {
    actions: (item) => (
      <NavigationMore
        childrenFirst
        hideOnClickInside
        items={[
          {
            title: 'Edit',
            onClick: () => editProjectSetting(item),
            icon: <IconEdit />,
          },
          {
            title: 'Delete',
            onClick: () => setSettingToDelete(item),
            icon: <IconDelete />,
          },
        ]}
      >
        {getTestableCredentialTypes().includes(item.credential_type.toLocaleLowerCase()) && (
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
    ),
    credential_type: (item) => humanize(item.credential_type),
    credential_values: (item) =>
      getSettingCredsURL(
        item.credential_values as Array<{ key: string; value: string }>,
        item.credential_type.toLowerCase()
      ),
  }

  const refreshProjectSettings = useCallback(() => {
    projectSettingsStore.fetchProjectSettings(pagination.page, pagination.perPage, filters)
  }, [pagination.page, pagination.perPage, filters])

  useEffect(() => {
    loadProjectOptions('')
    loadCreatedByOptions()
  }, [loadProjectOptions, loadCreatedByOptions])

  useEffect(() => {
    refreshProjectSettings()
  }, [pagination, filters])

  const areFiltersEmpty = useMemo(() => {
    return checkEmptyFilters(filters)
  }, [filters])

  const renderCustomFilter = useCallback(
    (definition: FilterDefinition, value: unknown, onChange: (value: any) => void) => {
      if (definition.name === CREATED_BY) {
        return (
          <UserFilter
            definition={definition}
            value={value as string}
            onChange={onChange}
            isChecked={isCreatedByMeChecked}
            setIsChecked={setIsCreatedByMeChecked}
          />
        )
      }
      return null
    },
    [isCreatedByMeChecked]
  )

  return (
    <div>
      <ConfirmationModal
        header="Confirm Delete"
        message="Are you sure you want to delete this integration?"
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<IconDelete />}
        visible={!!settingToDelete}
        onCancel={() => setSettingToDelete(null)}
        onConfirm={deleteProjectSetting}
      >
        <IntegrationDeleteWarning setting={settingToDelete || undefined} />
      </ConfirmationModal>
      <Table
        items={projectSettings as ProjectSetting[]}
        columnDefinitions={tableColumns}
        pagination={projectSettingsPagination}
        onPaginationChange={onPaginationUpdate}
        customRenderColumns={customTableColumns}
        perPageOptions={DECIMAL_PAGINATION_OPTIONS}
      />
      {portalSidebarRef.current
        ? createPortal(
            <Filters
              areFiltersEmpty={areFiltersEmpty}
              onApply={applyFilters}
              searchValue={filters.search || ''}
              filterDefinitions={filterDefinitions}
              searchPlaceholder="Search"
              searchKey={'search' as keyof typeof INITIAL_FILTERS}
              renderCustomFilter={renderCustomFilter}
            />,
            portalSidebarRef.current
          )
        : null}
    </div>
  )
}

export default ProjectSettings
