// Copyright 2026 EPAM Systems, Inc. ("EPAM")
// Licensed under the Apache License, Version 2.0

import { FC, ReactNode, useEffect, useState } from 'react'

import { PROJECTS_MANAGEMENT_INTEGRATIONS, PROJECTS_MANAGEMENT_MODELS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { analyticsStore } from '@/store/analytics'
import { appInfoStore } from '@/store/appInfo'
import { projectModelSettingsStore } from '@/store/projectModelSettings'
import { projectSettingsStore } from '@/store/projectSettings'
import { TabularMetricType, TimePeriod } from '@/types/analytics'
import { cn } from '@/utils/utils'

import {
  getConfigurableModels,
  isModelAvailable,
  settingsToSelection,
} from './projectModelConfiguration'

const TOP_MODELS_LIMIT = 5
const USAGE_PERIOD = TimePeriod.LAST_30_DAYS

interface ModelUsageRow {
  model: string
  requests: number
}

interface ModelAvailabilitySummary {
  available: number
  total: number
  autoRoutingEnabled: boolean
  hidePremiumModels: boolean
}

interface Props {
  projectName: string
  canManageProject: boolean
  isModelsConfigEnabled?: boolean
}

const IndicatorCard: FC<{
  title: string
  action?: ReactNode
  children: ReactNode
  enforceMinHeight?: boolean
  className?: string
}> = ({ title, action, children, enforceMinHeight = true, className }) => (
  <div
    className={cn(
      'flex min-w-0 flex-col gap-3 rounded-lg border border-border-structural bg-surface-base-secondary p-4',
      enforceMinHeight && 'min-h-[140px]',
      className
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="text-sm font-medium text-text-primary">{title}</div>
      {action}
    </div>
    {children}
  </div>
)

const Unavailable: FC = () => <div className="text-xs text-text-quaternary">Not available</div>

/**
 * Project-level indicators of the Overview tab: model availability, model usage distribution,
 * and integrations. Each card loads independently and degrades to "Not available" when the
 * viewer lacks access to its source.
 */
const ProjectOverviewIndicators: FC<Props> = ({
  projectName,
  canManageProject,
  isModelsConfigEnabled = false,
}) => {
  const router = useVueRouter()
  const [models, setModels] = useState<ModelAvailabilitySummary | null | undefined>()
  const [usage, setUsage] = useState<ModelUsageRow[] | null | undefined>()
  const [integrations, setIntegrations] = useState<number | null | undefined>()

  useEffect(() => {
    let cancelled = false
    const settle =
      <T,>(setter: (value: T | null) => void) =>
      (value: T | null) => {
        if (!cancelled) setter(value)
      }

    if (isModelsConfigEnabled) {
      Promise.all([
        appInfoStore.getLLMModels(),
        projectModelSettingsStore.fetchSettings(projectName),
      ])
        .then(([catalog, settings]) => {
          const configurable = getConfigurableModels(catalog)
          const selection = settingsToSelection(settings, configurable)
          return {
            available: configurable.filter((model) =>
              isModelAvailable(model, selection, settings.hide_premium_models)
            ).length,
            total: configurable.length,
            autoRoutingEnabled: settings.auto_routing_enabled,
            hidePremiumModels: settings.hide_premium_models,
          }
        })
        .catch(() => null)
        .then(settle(setModels))

      analyticsStore
        .fetchTabularData(TabularMetricType.LLMS_USAGE, {
          projects: [projectName],
          time_period: USAGE_PERIOD,
          page: 0,
          per_page: TOP_MODELS_LIMIT,
        })
        .then((response) =>
          response
            ? response.data.rows.map((row) => ({
                model: typeof row.model_name === 'string' ? row.model_name : '—',
                requests: Number(row.total_requests ?? 0),
              }))
            : null
        )
        .catch(() => null)
        .then(settle(setUsage))
    } else {
      setModels(null)
      setUsage(null)
    }

    projectSettingsStore
      .listAllProjectSettings(projectName)
      .then((settings) => settings.length)
      .catch(() => null)
      .then(settle(setIntegrations))

    return () => {
      cancelled = true
    }
  }, [isModelsConfigEnabled, projectName])

  const maxRequests = Math.max(1, ...(usage ?? []).map((row) => row.requests))
  const openTab = (route: string) => router.push({ name: route, params: { projectName } })
  const tabLink = (route: string, label: string) =>
    canManageProject ? (
      <button
        type="button"
        className="shrink-0 text-xs text-text-accent-status hover:text-text-accent-status-hover"
        onClick={() => openTab(route)}
      >
        {label}
      </button>
    ) : undefined
  const loading = <div className="text-xs text-text-quaternary">Loading…</div>

  return (
    <section>
      <div className="mb-3 text-sm font-semibold text-text-primary">Integrations</div>
      <div
        className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${
          isModelsConfigEnabled ? 'xl:grid-cols-3' : 'xl:grid-cols-1'
        }`}
      >
        {isModelsConfigEnabled && (
          <IndicatorCard
            title="Model availability"
            action={tabLink(PROJECTS_MANAGEMENT_MODELS, 'Configure')}
          >
            {models === undefined && loading}
            {models === null && <Unavailable />}
            {models && (
              <>
                <div className="text-base font-semibold text-text-primary">
                  {models.available} of {models.total} models
                </div>
                <div className="flex flex-col gap-1 text-xs text-text-quaternary">
                  <span>Automatic routing: {models.autoRoutingEnabled ? 'On' : 'Off'}</span>
                  <span>Premium models: {models.hidePremiumModels ? 'Hidden' : 'Visible'}</span>
                </div>
              </>
            )}
          </IndicatorCard>
        )}

        {isModelsConfigEnabled && (
          <IndicatorCard title="Model usage · 30 days">
            {usage === undefined && loading}
            {usage === null && <Unavailable />}
            {usage && !usage.length && (
              <div className="text-xs text-text-quaternary">No model requests yet</div>
            )}
            {usage && !!usage.length && (
              <ul className="flex flex-col gap-2" aria-label="Requests by model">
                {usage.map((row) => (
                  <li key={row.model} className="flex flex-col gap-1 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="truncate text-text-primary" title={row.model}>
                        {row.model}
                      </span>
                      <span className="shrink-0 tabular-nums text-text-quaternary">
                        {row.requests.toLocaleString()}
                      </span>
                    </div>
                    <meter
                      className="h-1.5 w-full"
                      min={0}
                      max={maxRequests}
                      value={row.requests}
                      aria-label={`${row.model}: ${row.requests} requests`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </IndicatorCard>
        )}

        <IndicatorCard
          title={integrations?.toString() ?? ''}
          action={tabLink(PROJECTS_MANAGEMENT_INTEGRATIONS, 'View')}
          enforceMinHeight={false}
          className="lg:max-w-xs"
        >
          {integrations === undefined && loading}
          {integrations === null && <Unavailable />}
          {typeof integrations === 'number' && (
            <>
              <div className="text-xs text-text-quaternary">
                Project-level integration{integrations === 1 ? '' : 's'}
              </div>
            </>
          )}
        </IndicatorCard>
      </div>
    </section>
  )
}

export default ProjectOverviewIndicators
