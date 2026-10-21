// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useMemo, useState } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import StatusBadge, { StatusEnum } from '@/components/StatusBadge'
import { ModelOption } from '@/types/entity/configuration'
import { cn } from '@/utils/utils'

export enum ModelSelectionState {
  Checked = 'checked',
  Unchecked = 'unchecked',
  Mixed = 'mixed',
}

interface ModelConfigurationTableProps {
  models: ModelOption[]
  getSelectionState: (model: ModelOption) => ModelSelectionState
  onSelectionChange: (model: ModelOption, checked: boolean) => void
  /** A non-empty reason locks the row's checkbox and is shown as its tooltip. */
  getDisabledReason?: (model: ModelOption) => string | undefined
  emptyMessage?: string
  className?: string
}

const formatValue = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export const getProviderLabel = (provider?: string) => {
  if (!provider) return '—'
  return provider === 'azure_openai' ? 'Azure OpenAI' : formatValue(provider)
}

export const getCapabilities = (model: ModelOption) =>
  [model.multimodal ? 'multimodal' : null, model.supportsTools ? 'tools' : null].filter(
    Boolean
  ) as string[]

export const formatModelCost = (cost?: ModelOption['cost']) =>
  cost ? `$${(cost.input * 1_000_000).toFixed(2)} / $${(cost.output * 1_000_000).toFixed(2)}` : '—'

const ModelConfigurationTable: FC<ModelConfigurationTableProps> = ({
  models,
  getSelectionState,
  onSelectionChange,
  getDisabledReason,
  emptyMessage = 'No models match your search or filters.',
  className = '',
}) => {
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState<string | number | null>('all')
  const [premiumOnly, setPremiumOnly] = useState(false)
  const [selectedOnly, setSelectedOnly] = useState(false)

  const hasPremiumMetadata = models.some((model) => model.isPremium)

  const providerOptions = useMemo(
    () => [
      { label: 'All providers', value: 'all' },
      ...Array.from(
        new Set(
          models.map((model) => model.provider).filter((value): value is string => Boolean(value))
        )
      ).map((value) => ({ label: getProviderLabel(value), value })),
    ],
    [models]
  )

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return models.filter(
      (model) =>
        `${model.label} ${model.value}`.toLowerCase().includes(normalizedQuery) &&
        (provider === 'all' || model.provider === provider) &&
        (!premiumOnly || model.isPremium) &&
        (!selectedOnly || getSelectionState(model) !== ModelSelectionState.Unchecked)
    )
  }, [getSelectionState, models, premiumOnly, provider, query, selectedOnly])

  const enabledVisibleCount = filteredModels.filter(
    (model) => getSelectionState(model) === ModelSelectionState.Checked
  ).length
  const hasMixedVisibleState = filteredModels.some(
    (model) => getSelectionState(model) === ModelSelectionState.Mixed
  )
  const allVisibleEnabled =
    filteredModels.length > 0 && enabledVisibleCount === filteredModels.length
  const someVisibleEnabled = hasMixedVisibleState || (enabledVisibleCount > 0 && !allVisibleEnabled)

  const toggleVisibleSelection = () => {
    const enabled = !allVisibleEnabled
    filteredModels
      .filter((model) => !getDisabledReason?.(model))
      .forEach((model) => onSelectionChange(model, enabled))
  }

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            aria-label="Search models"
            placeholder="Search models"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            rootClass="w-full sm:w-64"
          />
          <Select
            aria-label="Provider"
            value={provider}
            onChangeValue={setProvider}
            options={providerOptions}
            rootClassName="w-44"
          />

          <div className="flex gap-4 ml-2">
            {hasPremiumMetadata && (
              <Checkbox
                label="Premium only"
                checked={premiumOnly}
                onChange={setPremiumOnly}
                rootClassName="self-center gap-0"
              />
            )}

            <Checkbox
              label="Selected only"
              checked={selectedOnly}
              onChange={setSelectedOnly}
              rootClassName="self-center gap-0"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border-structural">
        <table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[33%]" />
            <col className="w-[18%]" />
            <col className="w-[23%]" />
            <col className="w-[22%]" />
          </colgroup>
          <thead className="bg-surface-base-secondary text-xs text-text-quaternary">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  label=""
                  checked={allVisibleEnabled}
                  mixed={someVisibleEnabled}
                  onChange={toggleVisibleSelection}
                />
              </th>
              <th className="truncate px-4 py-3 font-medium">Model</th>
              <th className="truncate px-4 py-3 font-medium">Provider</th>
              <th className="truncate px-4 py-3 font-medium">Capabilities</th>
              <th className="truncate px-4 py-3 font-medium">Cost / 1M tokens (IN / OUT)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-structural">
            {filteredModels.map((model) => {
              const selectionState = getSelectionState(model)
              const capabilities = getCapabilities(model)
              const disabledReason = getDisabledReason?.(model)

              return (
                <tr
                  key={model.value}
                  className={cn(model.isPremium && 'bg-yellow-500/5', 'text-sm h-12')}
                >
                  <td
                    className="px-4 py-3 align-middle"
                    data-tooltip-id={disabledReason ? 'react-tooltip' : undefined}
                    data-tooltip-content={disabledReason}
                  >
                    <Checkbox
                      label=""
                      checked={selectionState === ModelSelectionState.Checked}
                      mixed={selectionState === ModelSelectionState.Mixed}
                      disabled={!!disabledReason}
                      onChange={(checked) => onSelectionChange(model, checked)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">
                    <div className="flex min-w-0 items-center">
                      <span className="flex-1 truncate">{model.label}</span>
                      {model.isPremium && (
                        <span className="ml-2 inline-flex shrink-0">
                          <StatusBadge status={StatusEnum.Warning} text="Premium" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="overflow-hidden truncate px-4 py-3 text-text-quaternary">
                    {getProviderLabel(model.provider)}
                  </td>
                  <td className="overflow-hidden px-4 py-3 align-middle">
                    <div className="flex min-w-0 flex-nowrap items-center gap-1">
                      {capabilities.length ? (
                        capabilities.map((capability) => (
                          <span
                            key={capability}
                            className="max-w-full truncate rounded-full border border-border-structural px-2 py-0.5 text-xs text-text-quaternary"
                          >
                            {capability}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-quaternary">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    <div
                      className="flex items-center"
                      style={{ color: model.isPremium ? '#E6A700' : 'inherit' }}
                    >
                      {formatModelCost(model.cost)}
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredModels.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-quaternary">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ModelConfigurationTable
