// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import PageLayout from '@/components/Layouts/Layout'
import PremiumModelBadge from '@/components/PremiumModelBadge'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

import RoutersSection from './components/RoutersSection'
import { PROVIDER_LABELS } from './constants'

const formatCost = (cost?: { input: number; output: number }) =>
  cost ? `$${(cost.input * 1_000_000).toFixed(2)} / $${(cost.output * 1_000_000).toFixed(2)}` : '—'

const getDefaultFor = (model: any) => {
  if (model.value === 'GPT-4.1 2025-04-14') return 'global'
  if (model.value === 'GPT-5 2025-08-07') return 'CLI'
  return '—'
}

const ReadOnlyModelsCatalogPage: FC = () => {
  const { llmModels, llmRouters, getLLMModels } = useSnapshot(appInfoStore)
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState<string | number | null>('all')
  const [premiumOnly, setPremiumOnly] = useState(false)

  useEffect(() => {
    getLLMModels()
  }, [getLLMModels])

  const providers = useMemo(
    () => [...new Set(llmModels.map((m) => m.provider).filter(Boolean))] as string[],
    [llmModels]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return llmModels.filter(
      (m) =>
        (!q || m.label.toLowerCase().includes(q)) &&
        (provider === 'all' || m.provider === provider) &&
        (!premiumOnly || m.isPremium)
    )
  }, [llmModels, search, provider, premiumOnly])

  const premiumCount = llmModels.filter((m) => m.isPremium).length

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto w-full px-6 py-8">
        <h1 className="text-h2 text-text-primary mb-2">Available models</h1>
        <p className="text-sm text-text-tertiary mb-6">
          All models available on this deployment.{' '}
          <span className="text-aborted-primary">Premium</span> models are billed at higher rates
          and count against your project&rsquo;s Premium models budget.
        </p>

        <RoutersSection routers={[...llmRouters]} />

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
              value={premiumOnly ? 'premium' : 'all'}
              onChangeValue={(v) => setPremiumOnly(v === 'premium')}
              options={[
                { label: 'All models', value: 'all' },
                { label: 'Premium only', value: 'premium' },
              ]}
              rootClassName="w-44"
            />
            <span className="ml-auto text-xs text-text-quaternary">
              {filtered.length} models · {premiumCount} premium
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border-structural">
          <table className="w-full table-fixed text-sm text-left">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead className="bg-surface-base-secondary text-xs text-text-quaternary border-b border-border-structural">
              <tr>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Capabilities</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  Cost / 1M tokens (IN / OUT)
                </th>
                <th className="px-4 py-3 font-medium">Default for</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-structural">
              {filtered.map((m) => (
                <tr key={m.value} className={cn(m.isPremium && 'bg-yellow-500/5')}>
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
                      {m.multimodal || m.supportsTools || m.supportsImageGeneration ? (
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
                          {m.supportsImageGeneration && (
                            <span className="whitespace-nowrap rounded-full border border-border-structural px-2 py-0.5 text-xs text-text-quaternary">
                              image gen
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
                  <td className="px-4 py-3 text-text-quaternary">{getDefaultFor(m)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-text-quaternary">
                    No models match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageLayout>
  )
}

export default ReadOnlyModelsCatalogPage
