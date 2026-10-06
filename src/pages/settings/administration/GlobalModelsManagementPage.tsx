// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import { Checkbox } from '@/components/form/Checkbox'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import PageLayout from '@/components/Layouts/Layout'
import NavigationMore from '@/components/NavigationMore'
import PremiumModelBadge from '@/components/PremiumModelBadge'
import BulkActions from '@/components/Table/BulkActions'
import DefaultModelsSelector from '@/pages/settings/administration/projectsManagement/components/DefaultModelsSelector'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

const formatCost = (cost?: { input: number; output: number }) =>
  cost ? `$${(cost.input * 1_000_000).toFixed(2)} / $${(cost.output * 1_000_000).toFixed(2)}` : '—'

const getModelStatus = (model: any) => {
  if (model.deprecated) return 'deprecated'
  if (model.disabled) return 'disabled'
  return 'enabled'
}

const PROVIDER_LABELS: Record<string, string> = {
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertex: 'Google Vertex AI',
}

const GlobalModelsManagementPage: FC = () => {
  const { llmModels, getLLMModels } = useSnapshot(appInfoStore)
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState<string | number | null>('all')
  const [status, setStatus] = useState<string | number | null>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [globalDefault, setGlobalDefault] = useState<string | null>('GPT-5 2025-08-07')
  const [cliDefault, setCliDefault] = useState<string | null>('GPT-5 2025-08-07')

  useEffect(() => {
    getLLMModels()
  }, [getLLMModels])

  const providers = useMemo(
    () => [...new Set(llmModels.map((m) => m.provider).filter(Boolean))] as string[],
    [llmModels]
  )

  const statusOptions = useMemo(
    () => [
      { label: 'All statuses', value: 'all' },
      { label: 'Enabled', value: 'enabled' },
      { label: 'Disabled', value: 'disabled' },
      { label: 'Deprecated', value: 'deprecated' },
    ],
    []
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return llmModels.filter(
      (m) =>
        (!q || m.label.toLowerCase().includes(q)) &&
        (provider === 'all' || m.provider === provider) &&
        (status === 'all' || getModelStatus(m) === status)
    )
  }, [llmModels, search, provider, status])

  const premiumCount = llmModels.filter((m) => m.isPremium).length

  const toggleSelection = (modelValue: string) => {
    const next = new Set(selected)
    if (next.has(modelValue)) next.delete(modelValue)
    else next.add(modelValue)
    setSelected(next)
  }

  const toggleAllVisible = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((m) => m.value)))
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selected.size === 0 || !newStatus) return
    console.log(`UI-only: Would update ${selected.size} models to status: ${newStatus}`)
    setSelected(new Set())
  }

  const handleSingleStatusChange = async (modelValue: string, newStatus: string) => {
    console.log(`UI-only: Would update single model ${modelValue} to status: ${newStatus}`)
  }

  const renderContent = () => (
    <div className="flex flex-col gap-0">
      <div>
        <h1 className="text-h2 text-text-primary mb-2">Global model management</h1>
        <p className="text-sm text-text-tertiary mb-6">
          Configure platform-wide default models and manage model availability across all projects.
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-base font-semibold text-text-primary mb-3">Default models</h2>
        <DefaultModelsSelector
          models={llmModels}
          defaultModel={globalDefault ?? ''}
          onDefaultChange={(value) => {
            setGlobalDefault(value)
            console.log(`Set global default model to: ${value}`)
          }}
          codeDefaultModel={cliDefault ?? ''}
          onCodeDefaultChange={(value) => {
            setCliDefault(value)
            console.log(`Set CLI default model to: ${value}`)
          }}
        />
      </div>

      <div className="mb-3">
        <h2 className="text-base font-semibold text-text-primary mb-2">Model configuration</h2>
        <p className="text-sm text-text-tertiary">
          Manage model availability and status across the platform. {filtered.length} of{' '}
          {llmModels.length} models available · {premiumCount} premium
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            aria-label="Search models"
            placeholder="Search models"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            rootClass="w-full sm:w-64"
          />
          <Select
            aria-label="Provider"
            value={provider}
            onChangeValue={setProvider}
            options={[
              { label: 'All providers', value: 'all' },
              ...providers.map((p) => ({ label: PROVIDER_LABELS[p] ?? p, value: p })),
            ]}
            rootClassName="w-44"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChangeValue={(value) => setStatus(value ?? 'all')}
            options={statusOptions}
            rootClassName="w-44"
          />
          <span className="ml-auto text-xs text-text-quaternary">{filtered.length} models</span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex justify-end">
          <BulkActions selected={selected.size} onUnselect={() => setSelected(new Set())}>
            <NavigationMore
              renderInRoot
              hideOnClickInside
              menuClassName="!p-0 !w-auto"
              customIcon={
                <span className="flex items-center gap-2 whitespace-nowrap">Bulk Actions</span>
              }
              buttonClassName="!m-0 flex h-7 items-center justify-center gap-1.5 rounded-lg border button bg-button-primary-bg px-2 py-0.5 text-xs font-semibold leading-6 tracking-tight text-text-accent transition-colors whitespace-nowrap hover:bg-button-primary-bg-hover"
              items={[
                {
                  title: 'Enable',
                  onClick: () => {
                    handleBulkStatusChange('enabled')
                  },
                },
                {
                  title: 'Disable',
                  onClick: () => {
                    handleBulkStatusChange('disabled')
                  },
                },
                {
                  title: 'Deprecate',
                  onClick: () => {
                    handleBulkStatusChange('deprecated')
                  },
                },
              ]}
            />
          </BulkActions>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border-structural">
        <table className="w-full table-fixed text-sm text-left">
          <colgroup>
            <col className="w-[4%]" />
            <col className="w-[24%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[24%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-surface-base-secondary text-xs text-text-quaternary border-b border-border-structural">
            <tr>
              <th className="w-12 px-4 py-3">
                <Checkbox
                  label=""
                  checked={selected.size === filtered.length && filtered.length > 0}
                  mixed={selected.size > 0 && selected.size < filtered.length}
                  onChange={toggleAllVisible}
                />
              </th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Capabilities</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">
                Cost / 1M tokens (IN / OUT)
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-structural">
            {filtered.map((m) => {
              const modelStatus = getModelStatus(m)
              return (
                <tr
                  key={m.value}
                  className={cn(
                    m.isPremium && 'bg-yellow-500/5',
                    selected.has(m.value) && 'bg-primary-500/10'
                  )}
                >
                  <td className="px-4 py-3 align-middle">
                    <Checkbox
                      label=""
                      checked={selected.has(m.value)}
                      onChange={() => toggleSelection(m.value)}
                    />
                  </td>
                  <td className="break-words px-4 py-3 font-medium text-text-primary">
                    <span className="flex items-center gap-2">
                      {m.label}
                      {m.isPremium && <PremiumModelBadge />}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-quaternary">
                    {(m.provider && (PROVIDER_LABELS[m.provider] ?? m.provider)) || '—'}
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex flex-col items-start gap-1">
                      {m.multimodal || m.supportsTools ? (
                        <>
                          {m.multimodal && (
                            <span className="whitespace-nowrap rounded-full border border-border-structural px-2 py-0.5 text-xs text-text-quaternary">
                              multimodal
                            </span>
                          )}
                          {m.supportsTools && (
                            <span className="whitespace-nowrap rounded-full border border-border-structural px-2 py-0.5 text-xs text-text-quaternary">
                              tools
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-text-quaternary">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary">
                    <div
                      className="flex items-center font-geist-mono text-xs"
                      style={{ color: m.isPremium ? '#E6A700' : 'inherit' }}
                    >
                      {formatCost(m.cost)}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <Select
                      value={modelStatus}
                      onChangeValue={(value) => {
                        if (value && value !== modelStatus) {
                          handleSingleStatusChange(m.value, value)
                        }
                      }}
                      options={[
                        { label: 'Enabled', value: 'enabled' },
                        { label: 'Disabled', value: 'disabled' },
                        { label: 'Deprecated', value: 'deprecated' },
                      ]}
                      rootClassName="min-w-32"
                    />
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-quaternary">
                  No models match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto w-full px-6 py-8">{renderContent()}</div>
    </PageLayout>
  )
}

export default GlobalModelsManagementPage
