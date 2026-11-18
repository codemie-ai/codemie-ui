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

import { FC, useId, useState } from 'react'
import { Tooltip } from 'react-tooltip'

import AlertIcon from '@/assets/icons/alert.svg?react'

import type { CostState } from '../costCompleteness'

interface CostDetailsIconProps {
  status: string
  models: string[]
  details?: string
  testId?: string
}

const EXPLANATION = 'The estimate excludes usage that could not be priced.'

// Use a generic explanation when the API has no model names for this amount.
const buildTooltipText = ({ status, models, details }: Omit<CostDetailsIconProps, 'testId'>) => {
  const list =
    models.length > 1
      ? `Models with missing pricing for some or all usage:\n${models
          .map((m) => `• ${m}`)
          .join('\n')}`
      : models.length === 1 && `Model with missing pricing for some or all usage: ${models[0]}`
  const explanation =
    status === 'Cost unknown'
      ? 'The cost could not be estimated because pricing is unavailable for this usage.'
      : EXPLANATION
  return [`${status}.`, list, [explanation, details].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join('\n')
}

export const CostDetailsIcon: FC<CostDetailsIconProps> = ({ testId, ...content }) => {
  const id = useId()
  const [open, setOpen] = useState(false)
  const text = buildTooltipText(content)
  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  // The tooltip is mounted only while it is open: a table or legend of marked rows keeps one
  // react-tooltip instance at a time instead of one per row.
  return (
    <>
      <button
        type="button"
        aria-label={text}
        data-testid={testId}
        data-tooltip-id={id}
        data-tooltip-content={text}
        className="shrink-0 rounded-sm focus-visible:outline"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          // A marker inside a clickable row opens its tooltip only; it must not trigger the row.
          e.stopPropagation()
          show()
        }}
      >
        <AlertIcon className="h-3 w-3" aria-hidden="true" />
      </button>
      {open && (
        <Tooltip
          id={id}
          isOpen
          opacity={1}
          setIsOpen={setOpen}
          wrapper="span"
          positionStrategy="fixed"
          globalCloseEvents={{ escape: true, clickOutsideAnchor: true }}
          className="z-[10000] max-w-[min(500px,calc(100vw-2rem))] break-words whitespace-pre-line !text-left !rounded-lg !bg-surface-base-secondary !text-xs !font-normal !text-text-quaternary border border-border-structural"
        />
      )}
    </>
  )
}

/** Selection-level notice, for an answer whose rows carry no pricing of their own (an older backend). */
const CostIncompleteNotice: FC<{ state: CostState }> = ({ state }) => {
  if (!state.incomplete) return null
  return (
    <output
      data-testid="cost-incomplete-notice"
      className="inline-flex items-center gap-1 text-xs text-text-quaternary"
    >
      <CostDetailsIcon status="Partial estimate" models={state.unpricedModels} />
      <span>Partial estimate</span>
    </output>
  )
}

export default CostIncompleteNotice
