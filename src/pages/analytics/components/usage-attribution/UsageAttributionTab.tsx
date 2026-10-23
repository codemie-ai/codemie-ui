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

import ConfigureSvg from '@/assets/icons/configure.svg?react'
import Button from '@/components/Button'
import SelectButton from '@/components/SelectButton/SelectButton'
import Spinner from '@/components/Spinner'
import { toUaParams, usageAttributionStore } from '@/store/usageAttribution'
import type { AnalyticsQueryParams } from '@/types/analytics'
import toaster from '@/utils/toaster'
import { cn } from '@/utils/utils'

import { UA_SUB_TABS, UaSubTab } from './constants'
import { useSettingsOverrides } from './hooks/useSettingsOverrides'
import { useUaBaseParams, useUaPolling, withoutPoll } from './hooks/useUaQuery'
import AnalysisSettingsDialog from './settings/AnalysisSettingsDialog'
import { OverridesMap } from './settings/settingsModel'
import { errorText, errorTextWithWait, formatSeconds, formatUtcDate, formatUtcTime } from './utils'
import HowItWorksView from './views/HowItWorksView'
import OverviewView from './views/OverviewView'
import PeopleView from './views/PeopleView'

interface Props {
  filters: AnalyticsQueryParams
}

const UsageAttributionTab: FC<Props> = ({ filters }) => {
  const {
    settingsSchema,
    settingsError,
    lastAnalysis,
    analysisError,
    lastRange,
    encodedOverrides,
  } = useSnapshot(usageAttributionStore)
  const [view, setView] = useState<UaSubTab>('overview')
  const [dialog, setDialog] = useState<{ draft: OverridesMap; note: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const overrides = useSettingsOverrides(settingsSchema, !!settingsError)
  const params = useUaBaseParams(filters)
  const periodQuery = useMemo(() => {
    const q: Record<string, string> = {}
    if (filters.time_period) q.time_period = String(filters.time_period)
    if (filters.start_date) q.start_date = String(filters.start_date)
    if (filters.end_date) q.end_date = String(filters.end_date)
    return q
  }, [filters.time_period, filters.start_date, filters.end_date])

  // The status line describes the analysis of the current period and settings only. Widgets start their requests
  // in their own effects, which run before this one, and no response arrives before it. A poll asks the same again.
  const paramsKey = withoutPoll(params)
  useEffect(() => {
    usageAttributionStore.resetAnalysisStatus()
  }, [paramsKey])

  useUaPolling()

  useEffect(() => {
    usageAttributionStore.loadSettings().catch(console.error)
    return () => {
      // Requests of a tab that is closed are of no use.
      usageAttributionStore.controllers.forEach((c) => c.abort())
    }
  }, [])

  // A shared link opens the dialog with its settings; nothing is applied until Apply.
  useEffect(() => {
    if (!overrides.ready || !overrides.linkDraft || !settingsSchema) return
    const { overrides: draft, dropped } = overrides.linkDraft
    const n = Object.keys(draft).length
    const droppedVerb = dropped > 1 ? 's were' : ' was'
    const droppedNote = dropped ? `; ${dropped} invalid value${droppedVerb} ignored` : ''
    setDialog({
      draft,
      note: `${n} setting${
        n === 1 ? '' : 's'
      } from a shared link${droppedNote}. Nothing is applied until you click Apply; Cancel discards them.`,
    })
    // Only once per link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrides.ready, overrides.linkDraft])

  const closeDialog = () => {
    setDialog(null)
    overrides.clearLink()
  }

  const recompute = async () => {
    setRefreshing(true)
    const error = await usageAttributionStore.refresh(toUaParams(filters, encodedOverrides, 0))
    setRefreshing(false)
    if (error) toaster.error(errorTextWithWait(error))
    else
      toaster.info(
        'Recompute requested: the analysis runs again, at most once a minute per period and settings.'
      )
  }

  const asOf = (() => {
    if (!lastAnalysis?.computed_at) {
      return analysisError
        ? `Analysis unavailable: ${errorTextWithWait(analysisError)}`
        : 'Live data · analysing repositories…'
    }
    const n = overrides.count
    const time = formatUtcTime(lastAnalysis.computed_at)
    const took = formatSeconds(lastAnalysis.duration_ms)
    if (lastAnalysis.stale)
      return `Showing the analysis from ${time}: ${
        lastAnalysis.error || 'the latest computation failed.'
      }`
    if (!n || overrides.tier === 'view') {
      const settingPlural = n > 1 ? 's' : ''
      const display = n ? ` with your ${n} display setting${settingPlural}` : ''
      const every = settingsSchema?.fixed.analysis_cache_minutes ?? 15
      return `Live data · analysis from ${time}${display}, computed in ${took} and refreshed every ${every} minutes`
    }
    const how =
      overrides.tier === 'fetch'
        ? 'with its own Elasticsearch read'
        : 'on the cached Elasticsearch data'
    return `Live data · analysis with your ${n} custom setting${
      n > 1 ? 's' : ''
    } from ${time}, computed in ${took} ${how}`
  })()

  // "Last year" covers the longest range the analysis supports: say so, or the amounts read as a whole year.
  const clampNote = lastRange?.clamped
    ? `Showing ${Math.round(lastRange.days)} days, ${formatUtcDate(
        lastRange.from
      )} to ${formatUtcDate(lastRange.to)}: the longest period the analysis covers.`
    : null

  const renderView = () => {
    if (!overrides.ready) {
      return (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )
    }
    if (view === 'people') return <PeopleView params={params} periodQuery={periodQuery} />
    if (view === 'how') return <HowItWorksView params={params} schema={settingsSchema} />
    return <OverviewView params={params} periodQuery={periodQuery} />
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectButton
          options={UA_SUB_TABS.map((t) => ({ label: t.label, value: t.value }))}
          value={view}
          onChange={(v) => setView(v as UaSubTab)}
        />
        <Button
          variant="secondary"
          onClick={() => setDialog({ draft: overrides.applied, note: '' })}
          disabled={!settingsSchema}
          aria-label={
            overrides.count ? `Analysis Settings, ${overrides.count} changed` : 'Analysis Settings'
          }
        >
          <ConfigureSvg />
          Analysis Settings
          {overrides.count > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-in-progress-primary px-1 text-[10px] font-semibold text-white">
              {overrides.count}
            </span>
          )}
        </Button>
      </div>
      <p
        className="flex flex-wrap items-center gap-2 text-xs text-text-quaternary"
        data-testid="ua-asof"
      >
        {lastAnalysis?.refreshing && <Spinner inline className="h-3 w-3" />}
        <output
          className={cn(
            ((lastAnalysis?.stale && !lastAnalysis.refreshing) ||
              (!lastAnalysis?.computed_at && analysisError)) &&
              'text-failed-secondary'
          )}
        >
          {asOf}
        </output>
        {settingsSchema?.can_refresh && (
          <button
            type="button"
            className="font-semibold text-text-accent hover:underline disabled:opacity-50"
            onClick={() => {
              recompute().catch(console.error)
            }}
            disabled={refreshing}
          >
            ↻ Recompute
          </button>
        )}
      </p>
      {clampNote && (
        <output className="text-xs font-semibold text-aborted-primary">{clampNote}</output>
      )}
      {overrides.notice && (
        <output className="flex items-start justify-between gap-3 rounded-lg border border-aborted-primary bg-aborted-tertiary px-4 py-2 text-sm text-text-primary">
          <span>{overrides.notice}</span>
          <button
            type="button"
            className="text-text-quaternary hover:text-text-primary"
            onClick={overrides.dismissNotice}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </output>
      )}
      {!overrides.storageAvailable && overrides.count > 0 && (
        <p className="text-xs text-text-quaternary">
          Browser storage is unavailable: your settings last until the page is closed.
        </p>
      )}
      {settingsError && (
        <p className="text-xs text-failed-secondary">
          Analysis settings are unavailable ({errorText(settingsError)}); the tab uses the defaults.
        </p>
      )}
      {renderView()}
      {settingsSchema && dialog && (
        <AnalysisSettingsDialog
          visible
          schema={settingsSchema}
          applied={overrides.applied}
          initialDraft={dialog.draft}
          note={dialog.note}
          onApply={(draft) => {
            overrides.apply(draft)
            closeDialog()
            const n = Object.keys(draft).length
            const settingVerb = n > 1 ? 's are' : ' is'
            toaster.info(
              n
                ? `Your ${n} analysis setting${settingVerb} applied.`
                : 'Back to the default settings.'
            )
          }}
          onClose={closeDialog}
        />
      )}
    </div>
  )
}

export default UsageAttributionTab
