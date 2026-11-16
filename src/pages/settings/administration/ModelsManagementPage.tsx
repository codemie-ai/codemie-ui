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

import { useCallback, useEffect, useMemo, useState } from 'react'

import Button from '@/components/Button'
import ModelCapabilityChips from '@/components/ModelCapabilityChips'
import Table from '@/components/Table'
import { ButtonType } from '@/constants'
import SettingsLayout from '@/pages/settings/components/SettingsLayout'
import { AdminModel } from '@/types/entity/adminModel'
import { ModelStatus } from '@/types/entity/configuration'
import { ColumnDefinition, DefinitionTypes } from '@/types/table'
import { PROVIDER_LABELS, formatCost } from '@/utils/modelCatalog'
import { cn } from '@/utils/utils'

import GlobalDefaultSelector from './components/GlobalDefaultSelector'
import ModelNameCell from './components/ModelNameCell'
import ModelsBulkActions from './components/ModelsBulkActions'
import ModelsManagementFilters from './components/ModelsManagementFilters'
import ModelStatusBadge from './components/ModelStatusBadge'
import ModelStatusSelector from './components/ModelStatusSelector'
import { useModelsSettingsDraft } from './hooks/useModelsSettingsDraft'
import { MODELS_FILTERS_INITIAL_STATE, filterAdminModels } from './utils/modelsFilters'
import { isModelStatusEditable } from './utils/modelsSettingsDraft'

const columnDefinitions: ColumnDefinition[] = [
  { key: 'select', type: DefinitionTypes.Selection, headClassNames: '!w-[4%]' },
  { key: 'model', label: 'Model', type: DefinitionTypes.Custom, headClassNames: 'w-[26%]' },
  { key: 'provider', label: 'Provider', type: DefinitionTypes.Custom, headClassNames: 'w-[12%]' },
  {
    key: 'capabilities',
    label: 'Capabilities',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[17%]',
  },
  {
    key: 'cost',
    label: 'Cost / 1M tokens (in / out)',
    type: DefinitionTypes.Custom,
    headClassNames: 'w-[15%]',
  },
  { key: 'status', label: 'Status', type: DefinitionTypes.Custom, headClassNames: 'w-[11%]' },
]

// Premium rows carry a faint amber wash so cost outliers are visible while
// scanning, matching the design handoff without reaching for a raw palette colour.
const rowClassName = (item: AdminModel) => (item.isPremium ? '[&_td]:bg-aborted-tertiary/20' : '')

const createModelNameRenderer = (changedModelNames: ReadonlySet<string>) => (item: AdminModel) =>
  <ModelNameCell model={item} isDirty={changedModelNames.has(item.base_name)} />

const renderProviderCell = (item: AdminModel) => (
  <span className="text-text-tertiary">
    {(item.provider && (PROVIDER_LABELS[item.provider] ?? item.provider)) || '—'}
  </span>
)

const renderCapabilitiesCell = (item: AdminModel) => (
  <ModelCapabilityChips
    multimodal={item.multimodal}
    supportsTools={item.supportsTools}
    supportsImageGeneration={item.supportsImageGeneration}
  />
)

const renderCostCell = (item: AdminModel) => (
  <span
    className={cn(
      'font-geist-mono text-xs whitespace-nowrap',
      item.isPremium ? 'text-aborted-primary' : 'text-text-primary'
    )}
  >
    {formatCost(item.cost)}
  </span>
)

const ModelsManagementPage = () => {
  const {
    models,
    loading,
    loadError,
    defaultError,
    defaultModel,
    usePlatformDefault,
    saving,
    hasChanges,
    changedModelNames,
    defaultHasChanges,
    defaultIsValid,
    changeStatuses,
    changeDefault,
    resetDefault,
    discardChanges,
    saveChanges,
  } = useModelsSettingsDraft()
  const [filters, setFilters] = useState(MODELS_FILTERS_INITIAL_STATE)
  const [selected, setSelected] = useState<AdminModel[]>([])

  const providers = useMemo(
    () => [...new Set(models.map((m) => m.provider).filter(Boolean))] as string[],
    [models]
  )

  const filteredModels = useMemo(() => filterAdminModels(models, filters), [models, filters])
  const selectableModels = useMemo(
    () => filteredModels.filter(isModelStatusEditable),
    [filteredModels]
  )

  const summary = useMemo(() => {
    const count = (predicate: (m: AdminModel) => boolean) => filteredModels.filter(predicate).length
    return [
      `${filteredModels.length} of ${models.length} models`,
      `${count((m) => !!m.isPremium)} premium`,
      `${count((m) => m.status === 'disabled')} disabled`,
      `${count((m) => m.status === 'deprecated')} deprecated`,
    ].join(' · ')
  }, [filteredModels, models.length])

  const clearSelection = useCallback(() => setSelected([]), [])

  // Filtering away a selected row would otherwise leave it selected but
  // invisible, and the next bulk action would silently include it.
  useEffect(() => {
    setSelected((current) => {
      if (current.length === 0) return current
      const visible = new Set(selectableModels.map((m) => m.base_name))
      const next = current.filter((m) => visible.has(m.base_name))
      return next.length === current.length ? current : next
    })
  }, [selectableModels])

  const handleSelectAllChange = useCallback(
    async (checked: boolean) => {
      setSelected(checked ? selectableModels : [])
    },
    [selectableModels]
  )

  const handleStatusChange = useCallback(
    (model: AdminModel, status: ModelStatus) => changeStatuses([model], status),
    [changeStatuses]
  )

  const handleBulkStatusChange = useCallback(
    (targets: AdminModel[], status: ModelStatus) => {
      changeStatuses(targets, status)
      clearSelection()
    },
    [changeStatuses, clearSelection]
  )

  const renderStatusCell = useCallback(
    (item: AdminModel) =>
      isModelStatusEditable(item) ? (
        <ModelStatusSelector
          model={item}
          onStatusChange={handleStatusChange}
          disabled={saving || loading || loadError || selected.length > 1}
        />
      ) : (
        <ModelStatusBadge status={item.status} />
      ),
    [handleStatusChange, saving, loading, loadError, selected.length]
  )

  const customRenderColumns = useMemo(
    () => ({
      model: createModelNameRenderer(changedModelNames),
      provider: renderProviderCell,
      capabilities: renderCapabilitiesCell,
      cost: renderCostCell,
      status: renderStatusCell,
    }),
    [renderStatusCell, changedModelNames]
  )

  const renderContent = () => (
    <div className="flex flex-col h-full pt-6 gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="text-sm text-text-tertiary">
          <p>
            Configure platform-wide default models and manage model availability across all
            projects.
          </p>
          <p className="mt-1 text-xs">Changes take effect only after clicking Apply changes.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant={ButtonType.SECONDARY}
            onClick={() => {
              discardChanges()
              clearSelection()
            }}
            disabled={!hasChanges || saving}
          >
            Discard changes
          </Button>
          <Button
            variant={ButtonType.PRIMARY}
            onClick={async () => {
              if (await saveChanges()) clearSelection()
            }}
            disabled={!hasChanges || !defaultIsValid || saving || loadError}
            isLoading={saving}
          >
            Apply changes
          </Button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="text-sm text-text-error">
          Unable to load global model settings. Reload the page to try again.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text-primary">Default models</h2>
        <GlobalDefaultSelector
          models={models}
          value={defaultModel}
          usePlatformDefault={usePlatformDefault}
          isDirty={defaultHasChanges}
          loading={loading || saving || loadError}
          error={
            defaultError ||
            (!loading && !loadError && !defaultIsValid
              ? 'Enable at least one available model to set the global default.'
              : null)
          }
          onSelect={changeDefault}
          onReset={resetDefault}
        />
      </section>

      <section className="flex flex-col gap-3 grow">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Model configuration</h2>
          {!loading && (
            <p className="mt-1 text-sm text-text-tertiary">
              Manage model availability and status across the platform. {summary}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <ModelsManagementFilters filters={filters} providers={providers} onChange={setFilters} />
          <ModelsBulkActions
            selectedModels={selected}
            onClearSelection={clearSelection}
            onStatusChange={handleBulkStatusChange}
            disabled={saving || loading || loadError}
          />
        </div>

        <Table
          idPath="base_name"
          items={filteredModels}
          columnDefinitions={columnDefinitions}
          customRenderColumns={customRenderColumns}
          loading={loading}
          rowClassName={rowClassName}
          selected={selected}
          onSelectRow={setSelected}
          isRowSelectable={isModelStatusEditable}
          isAllSelected={selected.length > 0 && selected.length === selectableModels.length}
          onSelectAllChange={handleSelectAllChange}
        />
      </section>
    </div>
  )

  return <SettingsLayout contentTitle="Global model management" content={renderContent()} />
}

export default ModelsManagementPage
