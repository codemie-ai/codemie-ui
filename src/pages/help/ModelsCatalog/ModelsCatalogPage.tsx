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

import { FC, useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout'
import PremiumModelBadge from '@/components/PremiumModelBadge'
import { appInfoStore } from '@/store/appInfo'
import { cn } from '@/utils/utils'

const PROVIDER_LABELS: Record<string, string> = {
  azure_openai: 'Azure OpenAI',
  aws_bedrock: 'AWS Bedrock',
  google_vertexai: 'Google Vertex AI',
  anthropic: 'Anthropic',
  'vertex_ai-anthropic_models': 'Vertex AI Anthropic',
}

const formatCost = (cost?: { input: number; output: number }) =>
  cost ? `$${(cost.input * 1_000_000).toFixed(2)} / $${(cost.output * 1_000_000).toFixed(2)}` : '—'

const capabilityChipClass =
  'text-xs border border-border-secondary rounded-full px-2 py-0.5 text-text-quaternary'

const ModelsCatalogPage: FC = () => {
  const { llmModels, getLLMModels } = useSnapshot(appInfoStore)
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('')
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
        (!provider || m.provider === provider) &&
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

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models…"
            className="bg-surface-base-secondary border border-border-secondary rounded-lg px-3 py-2 text-sm text-text-primary w-60"
          />
          <select
            aria-label="Filter by provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-surface-base-secondary border border-border-secondary rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="">All providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_LABELS[p] ?? p}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              checked={premiumOnly}
              onChange={(e) => setPremiumOnly(e.target.checked)}
              aria-label="Premium only"
            />
            <span>Premium only</span>
          </label>
          <span className="ml-auto text-xs text-text-quaternary">
            {filtered.length} models · {premiumCount} premium
          </span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-specific-table-header text-text-quaternary text-xs uppercase">
              <th className="text-left px-3 py-2 font-medium">Model</th>
              <th className="text-left px-3 py-2 font-medium">Provider</th>
              <th className="text-left px-3 py-2 font-medium">Capabilities</th>
              <th className="text-left px-3 py-2 font-medium">Cost / 1M tokens (in / out)</th>
              <th className="text-left px-3 py-2 font-medium">Default for</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.value}
                className={cn(
                  'border-b border-border-structural',
                  m.isPremium && 'bg-yellow-500/5'
                )}
              >
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 text-text-primary font-medium">
                    {m.label}
                    {m.isPremium && <PremiumModelBadge />}
                  </span>
                </td>
                <td className="px-3 py-2 text-text-tertiary">
                  {(m.provider && (PROVIDER_LABELS[m.provider] ?? m.provider)) || '—'}
                </td>
                <td className="px-3 py-2">
                  <span className="flex gap-1 flex-wrap">
                    {m.multimodal && <span className={capabilityChipClass}>multimodal</span>}
                    {m.supportsTools && <span className={capabilityChipClass}>tools</span>}
                    {m.supportsImageGeneration && (
                      <span className={capabilityChipClass}>image gen</span>
                    )}
                  </span>
                </td>
                <td
                  className={cn(
                    'px-3 py-2 font-geist-mono text-xs',
                    m.isPremium ? 'text-aborted-primary' : 'text-text-primary'
                  )}
                >
                  {formatCost(m.cost)}
                </td>
                <td className="px-3 py-2 text-text-tertiary">
                  {m.defaultForCategories?.length ? m.defaultForCategories.join(', ') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageLayout>
  )
}

export default ModelsCatalogPage
