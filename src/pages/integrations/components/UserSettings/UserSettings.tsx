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
import { ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useIntegrationTypeOptions } from '@/hooks/useIntegrationTypeOptions'
import { useProjectOptions } from '@/hooks/useProjectOptions'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useVueRouter } from '@/hooks/useVueRouter'
import { INITIAL_FILTERS } from '@/pages/integrations/IntegrationsTab'
import { userStore } from '@/store'
import { userSettingsStore } from '@/store/userSettings'
import { UserSetting } from '@/types/entity/setting'
import { FilterDefinition, FilterDefinitionType, FilterOption } from '@/types/filters'
import { ColumnDefinition } from '@/types/table'
import { checkEmptyFilters, FILTER_ENTITY } from '@/utils/filters'
import { humanize } from '@/utils/helpers'
import { getSettingCredsURL, getTestableCredentialTypes, SETTING_TYPE_USER } from '@/utils/settings'
import toaster from '@/utils/toaster'

import IntegrationDeleteWarning from '../IntegrationDeleteWarning'
import TestIntegration from '../TestIntegration'

const REFRESH_TIMEOUT = 1000

interface Props {
  tableColumns: ColumnDefinition[]
  portalSidebarRef: React.RefObject<HTMLDivElement | null>
}

const UserSettings: FC<Props> = ({ tableColumns, portalSidebarRef }) => {
  const router = useVueRouter()
  const { userSettings, userSettingsPagination } = useSnapshot(
    userSettingsStore
  ) as typeof userSettingsStore
  const { user } = useSnapshot(userStore) as typeof userStore
  const [settingToDelete, setSettingToDelete] = useState<UserSetting | null>(null)
  const { projectOptions, loadProjectOptions } = useProjectOptions()

  const sharedOptions: FilterOption[] = [
    {
      label: 'All',
      value: null,
    },
    {
      label: 'Global',
      value: 'true',
    },
    {
      label: 'Non Global',
      value: 'false',
    },
  ]

  const { onPaginationUpdate, pagination, filters, applyFilters } = useTableFilters({
    filterKey: FILTER_ENTITY.USER_SETTINGS,
    initialPagination: { page: 0, perPage: userSettingsPagination.perPage },
  })

  const editUserSetting = (setting) => {
    router.push({
      name: 'edit-user-integration',
      query: {
        project_name: setting.project_name,
        credential_type: setting.credential_type,
        alias: setting.alias,
      },
    })
  }

  const deleteUserSetting = () => {
    if (!settingToDelete) return

    userSettingsStore.deleteUserSetting(settingToDelete.id).then((resp) => {
      if (resp.error) {
        toaster.error(resp.error)
      }

      toaster.info('Integration deleted successfully')

      userSettingsStore.resetIsSettingsIndexed()

      setTimeout(() => {
        userSettingsStore.fetchUserSettings(0, userSettingsPagination.perPage, filters)
      }, REFRESH_TIMEOUT)
    })

    setSettingToDelete(null)
  }

  const typeOptions = useIntegrationTypeOptions({
    settingType: SETTING_TYPE_USER,
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
    {
      name: 'is_global' as keyof typeof INITIAL_FILTERS,
      label: 'Global',
      value: filters['is_global' as keyof typeof INITIAL_FILTERS] || null,
      type: FilterDefinitionType.RadioGroup,
      options: sharedOptions,
      config: {
        defaultValue: sharedOptions[0],
      },
    },
  ]

  const customTableColumns: TableProps<UserSetting>['customRenderColumns'] = {
    actions: (item) => (
      <NavigationMore
        childrenFirst
        hideOnClickInside
        items={[
          {
            title: 'Edit',
            onClick: () => editUserSetting(item),
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
      getSettingCredsURL(item.credential_values, item.credential_type.toLowerCase()),
  }

  const refreshUserSettings = useCallback(async () => {
    await userSettingsStore.fetchUserSettings(pagination.page, pagination.perPage, filters)
  }, [pagination.page, pagination.perPage, filters])

  useEffect(() => {
    loadProjectOptions('')
  }, [loadProjectOptions])

  useEffect(() => {
    refreshUserSettings()
  }, [pagination, filters])

  const areFiltersEmpty = useMemo(() => {
    return checkEmptyFilters(filters)
  }, [filters])

  return (
    <div>
      <ConfirmationModal
        header="Confirm Delete"
        message="Are you sure you want to delete this integration?"
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<IconDelete />}
        visible={!!settingToDelete}
        onCancel={() => setSettingToDelete(null)}
        onConfirm={deleteUserSetting}
      >
        <IntegrationDeleteWarning setting={settingToDelete || undefined} />
      </ConfirmationModal>
      <Table
        items={userSettings}
        columnDefinitions={tableColumns}
        pagination={userSettingsPagination}
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
            />,
            portalSidebarRef.current
          )
        : null}
    </div>
  )
}

export default UserSettings
