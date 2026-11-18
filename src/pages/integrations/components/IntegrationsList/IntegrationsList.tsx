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

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import IconDelete from '@/assets/icons/delete.svg?react'
import Badge from '@/components/Badge'
import ConfirmationModal from '@/components/ConfirmationModal'
import { renderProjectNameCell } from '@/components/ProjectNameCell'
import Table from '@/components/Table'
import { TableProps } from '@/components/Table/Table'
import { ButtonType, DECIMAL_PAGINATION_OPTIONS } from '@/constants'
import { useIntegrationTypeOptions } from '@/hooks/useIntegrationTypeOptions'
import { useTableFilters } from '@/hooks/useTableFilters'
import { useVueRouter } from '@/hooks/useVueRouter'
import {
  editRouteName,
  integrationsStore,
  matchesSavedRow,
  SavedRowKey,
} from '@/store/integrations'
import { userStore } from '@/store/user'
import { Setting } from '@/types/entity/setting'
import { ColumnDefinition } from '@/types/table'
import { checkEmptyFilters, FILTER_ENTITY } from '@/utils/filters'
import { humanize } from '@/utils/helpers'
import {
  IntegrationScope,
  parseScopeFilter,
  SCOPE_ALL,
  SCOPE_LABEL,
  ScopeFilterValue,
  scopeFilterParam,
} from '@/utils/integrationScope'
import { getSettingCredsURL } from '@/utils/settings'
import toaster from '@/utils/toaster'
import { canUseProjectScope } from '@/utils/user'

import {
  applyScopeChange,
  dropTypesBoundElsewhere,
  toRequestFilters,
} from '../../utils/integrationFilters'
import IntegrationDeleteWarning from '../IntegrationDeleteWarning'
import IntegrationRowActionsCell from '../IntegrationRowActionsCell'
import IntegrationsFilters, { SCOPE_HINT, SCOPE_NOTICE } from './IntegrationsFilters'
import { renderIntegrationStateCell } from '../IntegrationStateBadge/renderIntegrationStateCell'

const NAME_ID_PREFIX = 'integration-name'

const renderActionsCell =
  (onEdit: (item: Setting) => void, onDelete: (item: Setting) => void) => (item: Setting) =>
    (
      <IntegrationRowActionsCell
        item={item}
        contextIdPrefix={NAME_ID_PREFIX}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

const COLUMNS: ColumnDefinition[] = [
  { label: 'Project', key: 'project_name', type: 'custom', shrink: true, semiBold: true },
  { label: 'Alias', key: 'alias', type: 'custom', shrink: true },
  { label: 'Scope', key: 'setting_type', type: 'custom' },
  { label: 'Type', key: 'credential_type', type: 'custom' },
  { label: 'URL', key: 'credential_values', type: 'custom' },
  { label: 'State', key: 'is_enabled', type: 'custom' },
  { label: '', key: 'actions', type: 'custom' },
]

// The API layer already toasts an HTTP error (rejected as a Response); a network failure rejects
// with a plain Error and would otherwise leave the previous rows on screen without a word.
const reportFailure = (message: string) => (error: unknown) => {
  if (!(error instanceof Response)) toaster.error(message)
}
const reportLoadFailure = reportFailure('Failed to load integrations')
const reportDeleteFailure = reportFailure('Failed to delete integration')

// The saved row is highlighted by background color alone, which a screen reader cannot pick up;
// "Just saved" rides along with the row's accessible name for whichever row it applies to.
const renderNameCell = (highlightedRow: SavedRowKey | null) => (item: Setting) =>
  (
    <span id={`${NAME_ID_PREFIX}-${item.id}`}>
      {item.alias || item.credential_type || 'Integration'}
      {highlightedRow && matchesSavedRow(item, highlightedRow) && (
        <span className="sr-only"> Just saved</span>
      )}
    </span>
  )

const renderScopeCell = (item: Setting) => (
  <span className="inline-flex items-center gap-1.5">
    <Badge>{SCOPE_LABEL[item.setting_type]}</Badge>
    {item.setting_type === IntegrationScope.USER && item.is_global && (
      <Badge variant="accent">Global</Badge>
    )}
  </span>
)

interface IntegrationsListProps {
  portalSidebarRef: React.RefObject<HTMLDivElement | null>
  /** Reports the Scope the list currently shows, for the page's Create button. */
  onScopeChange?: (scope: ScopeFilterValue) => void
}

const IntegrationsList: FC<IntegrationsListProps> = ({ portalSidebarRef, onScopeChange }) => {
  const router = useVueRouter()
  const { settings, pagination: listPagination, loading } = useSnapshot(integrationsStore)
  const [settingToDelete, setSettingToDelete] = useState<Setting | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [filtersKey, setFiltersKey] = useState(0)

  const { onPaginationUpdate, pagination, filters, applyFilters } = useTableFilters({
    filterKey: FILTER_ENTITY.INTEGRATIONS,
    initialPagination: { page: 0, perPage: integrationsStore.pagination.perPage },
  })

  // Only project-capable people see the Scope control; a member's value is always User.
  const { user: profile } = useSnapshot(userStore)
  const scopeVisible = canUseProjectScope(profile)
  const scope = { visible: scopeVisible, value: parseScopeFilter(filters.scope, scopeVisible) }
  const { options: typeOptions, boundTypes } = useIntegrationTypeOptions(scope.value)

  const [highlightedRow, setHighlightedRow] = useState<SavedRowKey | null>(null)
  // The row saved just before arriving here: taken once per mount, then reported after the
  // first fetch that lands. A ref keeps React 18 StrictMode double effects from taking it twice.
  const pendingSavedRow = useRef<SavedRowKey | null>(null)
  const savedRowTaken = useRef(false)
  const latest = useRef({ filters, scope, typeOptions })
  latest.current = { filters, scope, typeOptions }
  // The saved-row toast can outlive the list; its action must not touch filters after unmount.
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(() => {
    setHighlightedRow(null)
    return integrationsStore.fetchSettings({
      scope: scope.value,
      filters: toRequestFilters(filters, scope),
      page: pagination.page,
      perPage: pagination.perPage,
    })
  }, [filters, scope.value, scope.visible, pagination.page, pagination.perPage])

  const reportSavedRow = useCallback(() => {
    const key = pendingSavedRow.current
    // A superseded fetch resolves while the newer one is still loading: wait for the latter.
    if (!key || integrationsStore.loading) return
    pendingSavedRow.current = null

    if (integrationsStore.settings.some((item) => matchesSavedRow(item as Setting, key))) {
      setHighlightedRow(key)
      toaster.success('Integration saved<br>You are back on the same view.')
      return
    }

    const { filters: current, scope: currentScope, typeOptions: options } = latest.current
    const { type, project, ...otherFilters } = toRequestFilters(current, currentScope)
    const selectedTypes = Array.isArray(type) ? (type as string[]) : []
    const selectedProjects = Array.isArray(project) ? (project as string[]) : []
    const hiddenByScope =
      currentScope.visible && currentScope.value !== SCOPE_ALL && currentScope.value !== key.scope
    const hiddenByType = selectedTypes.length > 0 && !selectedTypes.includes(key.credential_type)
    const hiddenByProject =
      selectedProjects.length > 0 && !selectedProjects.includes(key.project_name)
    // Search, Global and Created by may hide it too; with none of these active, no filter does.
    if (!hiddenByScope && !hiddenByType && !hiddenByProject && checkEmptyFilters(otherFilters)) {
      toaster.success('Integration saved')
      return
    }

    const typeLabel =
      options.find((option) => option.value === key.credential_type)?.label ??
      humanize(key.credential_type)
    const text = `Integration saved<br>Your filters hide it: it is a ${
      SCOPE_LABEL[key.scope]
    } ${typeLabel} integration.`
    if (!hiddenByScope && !hiddenByType) {
      toaster.success(text)
      return
    }
    toaster.success(text, {
      action: {
        label: 'Show all scopes and types',
        onClick: () => {
          if (!mounted.current) return
          // The filters as they are on click: the person may have changed them since the toast.
          // Scope All offers neither Global nor Created by, so those go with Scope and Type.
          const {
            scope: _scope,
            type: _type,
            is_global: _global,
            created_by: _createdBy,
            ...reset
          } = latest.current.filters
          setNotice(null)
          setFiltersKey((value) => value + 1)
          applyFilters(reset)
        },
      },
    })
  }, [applyFilters])

  // Restored filters may hold a type bound to another scope: drop it before the first request.
  // Only once the profile is known: until then every person resolves to Scope User.
  const reconciledFilters = useMemo(
    () => (profile ? dropTypesBoundElsewhere(filters, scope.value) : null),
    [profile, filters, scope.value]
  )

  useEffect(() => {
    if (reconciledFilters) {
      setFiltersKey((key) => key + 1)
      applyFilters(reconciledFilters)
      return
    }
    if (!savedRowTaken.current) {
      savedRowTaken.current = true
      pendingSavedRow.current = integrationsStore.takeSavedRow()
    }
    refresh().then(reportSavedRow).catch(reportLoadFailure)
  }, [refresh, reportSavedRow, reconciledFilters, applyFilters])

  useEffect(() => {
    onScopeChange?.(scope.value)
  }, [scope.value, onScopeChange])

  const handleApply = useCallback(
    (applied: Record<string, unknown>) => {
      const { [SCOPE_NOTICE]: _notice, [SCOPE_HINT]: _hint, scope: appliedScope, ...rest } = applied
      if (!scope.visible) {
        setNotice(null)
        applyFilters(rest)
        return
      }
      const next = parseScopeFilter(appliedScope, true)
      if (next === scope.value) {
        setNotice(null)
        applyFilters({ ...rest, scope: scopeFilterParam(next) })
        return
      }
      const result = applyScopeChange(rest, next, boundTypes)
      setNotice(result.notice)
      setFiltersKey((key) => key + 1)
      applyFilters(result.filters)
    },
    [scope.visible, scope.value, boundTypes, applyFilters]
  )

  const editSetting = (setting: Setting) => {
    router.push({
      name: editRouteName(setting.setting_type),
      query: {
        project_name: setting.project_name,
        credential_type: setting.credential_type,
        alias: setting.alias,
      },
    })
  }

  const reloadAfterDelete = () => {
    // The only row of a later page is gone: show the page before it, not an empty page.
    if (settings.length === 1 && pagination.page > 0) {
      onPaginationUpdate(pagination.page - 1)
      return Promise.resolve()
    }
    return refresh().catch(reportLoadFailure)
  }

  const deleteSetting = () => {
    if (!settingToDelete) return
    const { id, setting_type: type } = settingToDelete
    setSettingToDelete(null)

    integrationsStore
      .deleteSetting(type, id)
      .then((resp) => {
        const error = (resp as { error?: string } | undefined)?.error
        if (error) {
          toaster.error(error)
          return Promise.resolve()
        }
        toaster.info('Integration deleted successfully')
        return reloadAfterDelete()
      })
      .catch(reportDeleteFailure)
  }

  const customRenderColumns: TableProps<Setting>['customRenderColumns'] = {
    project_name: renderProjectNameCell,
    alias: renderNameCell(highlightedRow),
    setting_type: renderScopeCell,
    credential_type: (item) => humanize(item.credential_type),
    credential_values: (item) =>
      getSettingCredsURL(item.credential_values, item.credential_type.toLowerCase()),
    is_enabled: renderIntegrationStateCell,
    actions: renderActionsCell(editSetting, setSettingToDelete),
  }

  const areFiltersEmpty = useMemo(
    () => checkEmptyFilters({ ...filters, scope: undefined }),
    [filters]
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
        onConfirm={deleteSetting}
      >
        <IntegrationDeleteWarning setting={settingToDelete || undefined} />
      </ConfirmationModal>
      <Table
        items={settings as Setting[]}
        columnDefinitions={COLUMNS}
        pagination={listPagination}
        loading={loading}
        onPaginationChange={onPaginationUpdate}
        customRenderColumns={customRenderColumns}
        perPageOptions={DECIMAL_PAGINATION_OPTIONS}
        ariaLabel="Integrations"
        isRowHighlighted={(item) => !!highlightedRow && matchesSavedRow(item, highlightedRow)}
      />
      <IntegrationsFilters
        portalSidebarRef={portalSidebarRef}
        filtersKey={filtersKey}
        filters={filters}
        scope={scope}
        notice={notice}
        typeOptions={typeOptions}
        areFiltersEmpty={areFiltersEmpty}
        onApply={handleApply}
      />
    </div>
  )
}

export default IntegrationsList
