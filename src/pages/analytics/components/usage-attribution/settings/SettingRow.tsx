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

import { FC, useState } from 'react'

import Button from '@/components/Button'
import Input from '@/components/form/Input'
import Switch from '@/components/form/Switch'
import type { UaOwnerRule, UaSettingSpec, UaSettingValue } from '@/types/usageAttribution'
import { cn } from '@/utils/utils'

import {
  displayValue,
  rangeText,
  ruleOwnerError,
  sameValue,
  validateSetting,
} from './settingsModel'

interface Props {
  spec: UaSettingSpec
  value: UaSettingValue
  readOnly: boolean
  /** A value that could not be parsed, or is out of range: shown, and Apply stays disabled. */
  error?: string
  /** The text typed in a number field, kept by the dialog so it survives switching tabs. */
  raw?: string
  onRaw: (text: string) => void
  onChange: (value: UaSettingValue) => void
  onError: (message: string) => void
  onReset: () => void
}

const scaleOf = (spec: UaSettingSpec) => (spec.type === 'share' ? 100 : 1)

const NumberInput: FC<Omit<Props, 'onReset'>> = ({
  spec,
  value,
  readOnly,
  error,
  raw,
  onRaw,
  onChange,
  onError,
}) => {
  const scale = scaleOf(spec)
  const shown =
    typeof value === 'number' && Number.isFinite(value) ? String(+(value * scale).toFixed(4)) : ''
  return (
    <div className="flex items-center gap-1.5">
      {spec.type === 'money' && <span className="text-xs text-text-quaternary">$</span>}
      <Input
        type="number"
        aria-label={spec.label}
        value={raw ?? shown}
        disabled={readOnly}
        step={spec.step ? spec.step * scale : undefined}
        min={spec.min !== null ? spec.min * scale : undefined}
        max={spec.max !== null ? spec.max * scale : undefined}
        rootClass="w-[110px]"
        inputClass="text-right"
        // The message is on the row; screen readers get it from the field too.
        error={error}
        errorClassName="sr-only"
        onChange={(e) => {
          onRaw(e.target.value)
          const parsed =
            e.target.value.trim() === ''
              ? NaN
              : Math.round((Number(e.target.value) / scale) * 10000) / 10000
          const message = validateSetting(spec, parsed)
          if (message) onError(message)
          else onChange(parsed)
        }}
      />
      {spec.type === 'share' && <span className="text-xs text-text-quaternary">%</span>}
      {spec.unit && <span className="text-xs text-text-quaternary">{spec.unit}</span>}
    </div>
  )
}

const Chip: FC<{ text: string; removeLabel: string; readOnly: boolean; onRemove: () => void }> = ({
  text,
  removeLabel,
  readOnly,
  onRemove,
}) => (
  <span className="inline-flex items-center gap-1 rounded-md border border-border-specific-panel-outline bg-surface-elevated px-2 py-0.5 text-xs">
    {text}
    {!readOnly && (
      <button
        type="button"
        aria-label={removeLabel}
        className="text-text-quaternary hover:text-text-primary"
        onClick={onRemove}
      >
        ×
      </button>
    )}
  </span>
)

const ListInput: FC<Omit<Props, 'onReset' | 'onError' | 'onRaw'>> = ({
  spec,
  value,
  readOnly,
  onChange,
}) => {
  const [text, setText] = useState('')
  const items = (value as string[]) ?? []
  const maxItems = spec.max_items ?? 50
  const full = items.length >= maxItems
  const add = () => {
    const next = text.trim()
    if (!next || full) return
    if (!items.includes(next)) onChange([...items, next])
    setText('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <Chip
          key={item}
          text={item}
          removeLabel={`Remove ${item}`}
          readOnly={readOnly}
          onRemove={() => onChange(items.filter((_, j) => j !== i))}
        />
      ))}
      {!readOnly && !full && (
        <Input
          aria-label={`Add to ${spec.label}`}
          placeholder="Add a value, Enter"
          value={text}
          maxLength={spec.max_item_length ?? 100}
          rootClass="w-[160px]"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          onBlur={add}
        />
      )}
      {!readOnly && full && (
        <span className="text-xs text-text-quaternary">
          Up to {maxItems} values: remove one to add another
        </span>
      )}
    </div>
  )
}

const RulesInput: FC<Omit<Props, 'onReset' | 'onError' | 'onRaw'>> = ({
  spec,
  value,
  readOnly,
  onChange,
}) => {
  const [owner, setOwner] = useState('')
  const [project, setProject] = useState('')
  const [hint, setHint] = useState('')
  const rules = (value as UaOwnerRule[]) ?? []
  const maxItems = spec.max_items ?? 50
  const full = rules.length >= maxItems
  const add = () => {
    const ownerError = ruleOwnerError(owner)
    if (ownerError) {
      setHint(ownerError)
      return
    }
    const o = owner
      .trim()
      .replace(/\/\*?$/, '')
      .toLowerCase()
    const p = project.trim()
    if (!p || full) return
    onChange([...rules.filter((r) => r.owner !== o), { owner: o, project: p }])
    setOwner('')
    setProject('')
    setHint('')
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {rules.map((r, i) => (
          <Chip
            key={r.owner}
            text={`${r.owner}/* → ${r.project}`}
            removeLabel={`Remove rule ${r.owner}`}
            readOnly={readOnly}
            onRemove={() => onChange(rules.filter((_, j) => j !== i))}
          />
        ))}
        {!rules.length && <span className="text-xs text-text-quaternary">No rules</span>}
      </div>
      {!readOnly && !full && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Owner"
            placeholder="owner"
            value={owner}
            maxLength={spec.max_item_length ?? 100}
            rootClass="w-[140px]"
            onChange={(e) => {
              setOwner(e.target.value)
              setHint('')
            }}
          />
          <span className="text-xs text-text-quaternary">{'/* →'}</span>
          <Input
            aria-label="Shared project"
            placeholder="shared project"
            value={project}
            maxLength={spec.max_item_length ?? 100}
            rootClass="w-[180px]"
            onChange={(e) => setProject(e.target.value)}
          />
          <Button variant="secondary" onClick={add} disabled={!owner.trim() || !project.trim()}>
            Add rule
          </Button>
          {hint && (
            <span className="text-xs font-semibold text-failed-secondary" role="alert">
              {hint}
            </span>
          )}
        </div>
      )}
      {!readOnly && full && (
        <span className="text-xs text-text-quaternary">
          Up to {maxItems} rules: remove one to add another
        </span>
      )}
    </div>
  )
}

/** One setting of the Analysis Settings dialog: its description, default and range, the input and a reset. */
const SettingRow: FC<Props> = (props) => {
  const { spec, value, readOnly, error, raw, onRaw, onChange, onError, onReset } = props
  const changed = !sameValue(value, spec.default)
  const wide = spec.type === 'list' || spec.type === 'rules'
  const range = rangeText(spec)
  const input = (() => {
    switch (spec.type) {
      case 'bool':
        // The switch reads only "On" or "Off": the group names the setting for screen readers.
        return (
          <fieldset className="border-0 p-0 m-0" aria-label={spec.label}>
            <Switch
              label={value ? 'On' : 'Off'}
              value={Boolean(value)}
              disabled={readOnly}
              onChange={(e) => onChange(e.target.checked)}
            />
          </fieldset>
        )
      case 'list':
        return <ListInput spec={spec} value={value} readOnly={readOnly} onChange={onChange} />
      case 'rules':
        return <RulesInput spec={spec} value={value} readOnly={readOnly} onChange={onChange} />
      default:
        return (
          <NumberInput
            spec={spec}
            value={value}
            readOnly={readOnly}
            error={error}
            raw={raw}
            onRaw={onRaw}
            onChange={onChange}
            onError={onError}
          />
        )
    }
  })()
  return (
    <div
      className={cn(
        'grid gap-3 border-b border-border-structural border-l-4 border-l-transparent px-3 py-3',
        wide ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_auto] items-center',
        changed && !error && 'border-l-in-progress-primary bg-in-progress-tertiary/30',
        error && 'border-l-failed-secondary bg-failed-tertiary/30'
      )}
      data-setting-row={spec.key}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">{spec.label}</div>
        <div className="mt-0.5 text-xs leading-5 text-text-quaternary">{spec.description}</div>
        <div className="mt-1 text-[11px] text-text-quaternary">
          Default {displayValue(spec, spec.default)}
          {range ? ` · allowed ${range}` : ''}
          {error && <span className="ml-2 font-semibold text-failed-secondary">{error}</span>}
        </div>
      </div>
      <div className={cn('flex items-center gap-2', wide ? 'justify-start' : 'justify-end')}>
        {input}
        {!readOnly && (
          <button
            type="button"
            className="h-7 w-7 rounded-md border border-border-specific-panel-outline text-text-quaternary hover:text-text-primary disabled:opacity-30"
            onClick={onReset}
            disabled={!changed && !error && raw === undefined}
            aria-label={`Reset ${spec.label} to the default`}
            title="Reset to the default"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  )
}

export default SettingRow
