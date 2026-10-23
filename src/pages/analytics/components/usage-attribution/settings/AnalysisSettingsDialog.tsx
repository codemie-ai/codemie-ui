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

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Tabs from '@/components/Tabs/Tabs'
import type { UaSettingValue, UaSettingsSchema } from '@/types/usageAttribution'
import { copyToClipboard } from '@/utils/helpers'

import { UA_LINK_PARAM } from '../constants'
import SettingRow from './SettingRow'
import {
  OverridesMap,
  buildSettingsLink,
  changedKeys,
  cleanOverrides,
  encodedSize,
  pendingTier,
  sameValue,
  toYaml,
} from './settingsModel'

const withRawValue =
  (key: string, text: string) =>
  (r: Record<string, string>): Record<string, string> => ({ ...r, [key]: text })

const withFieldError =
  (key: string, message: string) =>
  (e: Record<string, string>): Record<string, string> => ({ ...e, [key]: message })

interface Props {
  visible: boolean
  schema: UaSettingsSchema
  applied: OverridesMap
  /** Settings to start from: the applied ones, or those of a shared link. */
  initialDraft: OverridesMap
  note?: string
  onApply: (draft: OverridesMap) => void
  onClose: () => void
}

/** Analysis Settings: a standard dialog with one tab per group of settings, kept only in this browser. */
const AnalysisSettingsDialog: FC<Props> = ({
  visible,
  schema,
  applied,
  initialDraft,
  note,
  onApply,
  onClose,
}) => {
  const readOnly = !schema.can_tune
  const [draft, setDraft] = useState<OverridesMap>(initialDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  // Text typed in number fields, so a field shows what was typed (and its error) after switching tabs.
  const [raw, setRaw] = useState<Record<string, string>>({})
  const [tab, setTab] = useState(schema.groups[0]?.id ?? 'view')
  const [yaml, setYaml] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setDraft(initialDraft)
      setErrors({})
      setRaw({})
      const firstChanged = schema.settings.find((s) => s.key in initialDraft)
      setTab(firstChanged?.group ?? schema.groups[0]?.id ?? 'view')
    }
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const valueOf = (key: string): UaSettingValue => {
    if (key in draft) return draft[key]
    return schema.settings.find((s) => s.key === key)?.default as UaSettingValue
  }
  const setValue = (key: string, value: UaSettingValue) => {
    setErrors(({ [key]: _removed, ...rest }) => rest)
    const spec = schema.settings.find((s) => s.key === key)
    setDraft((d) => {
      const next = { ...d }
      if (spec && sameValue(value, spec.default)) delete next[key]
      else next[key] = value
      return next
    })
  }
  const resetKey = (key: string) => {
    setErrors(({ [key]: _removed, ...rest }) => rest)
    setRaw(({ [key]: _removed, ...rest }) => rest)
    setDraft(({ [key]: _removed, ...rest }) => rest)
  }

  const clean = useMemo(() => cleanOverrides(schema, draft), [schema, draft])
  const changed = changedKeys(schema, clean).length
  const hasErrors = Object.keys(errors).length > 0
  const size = encodedSize(clean)
  const tooBig = size > schema.tuning.max_override_bytes
  const tier = pendingTier(schema, applied, clean)
  const tierInfo = schema.tiers.find((t) => t.id === tier)
  const canApply = !readOnly && !hasErrors && !tooBig && tier !== null

  const summary = (() => {
    if (hasErrors)
      return (
        <span className="font-semibold text-failed-secondary">
          Fix the highlighted values to apply
        </span>
      )
    if (tooBig)
      return (
        <span className="font-semibold text-failed-secondary">
          The changes are larger than {Math.round(schema.tuning.max_override_bytes / 1024)} KB
        </span>
      )
    const what = changed ? `${changed} changed from the defaults` : 'All defaults'
    let cost = 'nothing to apply'
    if (tier)
      cost = changed
        ? `Apply: ${tierInfo?.label.toLowerCase()}`
        : 'Apply: the default analysis, from the cache'
    return (
      <span>
        <b>{what}</b> · {cost}
      </span>
    )
  })()

  const tabs = schema.groups.map((group) => {
    const groupTier = schema.tiers.find((t) => t.id === group.tier)
    const specs = schema.settings.filter((s) => s.group === group.id)
    const count = specs.filter((s) => errors[s.key] || s.key in clean).length
    return {
      id: group.id,
      label: count ? `${group.label} · ${count}` : group.label,
      element: (
        <div className="flex flex-col">
          <div className="mb-2 rounded-md border border-border-specific-panel-outline bg-surface-base-tertiary px-3 py-2 text-xs text-text-secondary">
            <b className="text-text-primary">{groupTier?.label}.</b> {groupTier?.description}
            {group.id === 'fetch' && (
              <span className="block mt-1">
                Not tunable here: the signal points, the {schema.fixed.max_range_days}-day maximum
                range, the {schema.fixed.analysis_cache_minutes}-minute cache, the{' '}
                {schema.fixed.analysis_timeout_seconds} s analysis timeout and the date the budget
                fallback field was first recorded. They are part of the customer configuration.
              </span>
            )}
          </div>
          {specs.map((spec) => (
            <SettingRow
              key={spec.key}
              spec={spec}
              value={valueOf(spec.key)}
              readOnly={readOnly}
              error={errors[spec.key]}
              raw={raw[spec.key]}
              onRaw={(text) => setRaw(withRawValue(spec.key, text))}
              onChange={(v) => setValue(spec.key, v)}
              onError={(message) => setErrors(withFieldError(spec.key, message))}
              onReset={() => resetKey(spec.key)}
            />
          ))}
        </div>
      ),
    }
  })

  const footer = (
    <div className="flex w-full flex-wrap items-center justify-between gap-3">
      <span className="text-xs text-text-secondary" aria-live="polite">
        {readOnly
          ? 'Read-only: only admins and maintainers can change the analysis settings.'
          : summary}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <Button
            variant="secondary"
            onClick={() => {
              setDraft({})
              setErrors({})
              setRaw({})
            }}
          >
            Reset to defaults
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() =>
            copyToClipboard(
              buildSettingsLink(clean, UA_LINK_PARAM),
              'Link copied: it opens Analysis Settings with these values'
            )
          }
          disabled={hasErrors || !changed}
        >
          Copy link
        </Button>
        <Button
          variant="secondary"
          onClick={() => setYaml(toYaml(clean))}
          disabled={hasErrors || !changed}
        >
          Copy as YAML
        </Button>
        <span className="mx-1 h-6 w-px bg-border-structural" aria-hidden />
        <Button variant="secondary" onClick={onClose}>
          {readOnly ? 'Close' : 'Cancel'}
        </Button>
        {!readOnly && (
          <Button variant="primary" disabled={!canApply} onClick={() => onApply(clean)}>
            Apply
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      <Popup
        visible={visible}
        onHide={onClose}
        header="Analysis Settings"
        headerDescription="Overrides apply only to you and are kept in this browser; only changed values are sent with each request, and nothing is saved on the server. Admins and maintainers can change them; auditors see them read-only."
        className="w-[96vw] max-w-[940px]"
        bodyClassName="!pt-2"
        footerContent={footer}
        dismissableMask={false}
      >
        <div className="flex flex-col gap-3 min-h-[420px]">
          {note && (
            <div className="rounded-md border border-in-progress-primary bg-in-progress-tertiary/40 px-3 py-2 text-xs text-text-primary">
              {note}
            </div>
          )}
          <Tabs tabs={tabs} activeTab={tab} onChange={setTab} isSmall alwaysShowTabs />
        </div>
      </Popup>
      <Popup
        visible={yaml !== null}
        onHide={() => setYaml(null)}
        header="Copy as YAML"
        headerDescription="The changed values as a customer configuration snippet, for a maintainer to make them the defaults."
        className="w-[96vw] max-w-[640px]"
        submitText="Copy"
        cancelText="Close"
        onSubmit={() => {
          if (yaml) copyToClipboard(yaml, 'YAML copied')
        }}
      >
        <pre className="max-h-[50vh] overflow-auto rounded-md border border-border-specific-panel-outline bg-surface-base-tertiary p-3 text-xs leading-5 text-text-primary">
          {yaml}
        </pre>
      </Popup>
    </>
  )
}

export default AnalysisSettingsDialog
