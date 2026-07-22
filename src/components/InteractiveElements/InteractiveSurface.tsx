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

import { FC, ReactElement, useState } from 'react'

import Button from '@/components/Button'
import {
  getElementHandler,
  type SurfaceContext,
} from '@/components/InteractiveElements/elementHandlers'
import {
  cleanLabel,
  collectAllElements,
  isInputElement,
} from '@/components/InteractiveElements/utils'
import { ButtonSize, ButtonType } from '@/constants'
import type {
  ButtonElement,
  InteractiveElement,
  InteractiveResponse,
  InteractiveResponseKind,
} from '@/types/entity/interactive'

export type InteractiveSubmitHandler = (
  kind: InteractiveResponseKind,
  payload: Record<string, unknown>,
  displayText: string
) => void

interface InteractiveSurfaceProps {
  request: { request_id: string; surface: InteractiveElement[] }
  disabled: boolean
  submittedResponse: InteractiveResponse | null
  onSubmit: InteractiveSubmitHandler
}

/**
 * Renders the whole fixed-schema surface as ONE interactive block with a single
 * submission. Element behavior (rendering, validation, answer payload, chip summary)
 * is delegated to the element-handler registry, so the surface stays generic: it owns
 * ONE opaque value-by-id state map and the single combined `submit`, and every element
 * type plugs in through its handler without adding anything to the surface or context.
 */
const InteractiveSurface: FC<InteractiveSurfaceProps> = ({
  request,
  disabled,
  submittedResponse,
  onSubmit,
}) => {
  const surface = Array.isArray(request.surface) ? request.surface : []
  const allElements = collectAllElements(surface)
  const inputElements = allElements.filter(isInputElement)
  const buttons = allElements.filter(
    (element): element is ButtonElement => element.type === 'button'
  )

  const submittedAnswers = (submittedResponse?.payload?.answers as Record<string, unknown>) ?? {}
  const submittedAction = submittedResponse?.payload?.action as string | undefined

  // ONE opaque value-by-id state map. Each element seeds its own initial value from a
  // prior answer via its handler, so re-answering starts pre-filled — a re-submit
  // re-runs the turn exactly like editing the previous user request.
  const [state, setState] = useState<Record<string, unknown>>(() => {
    const seed: Record<string, unknown> = {}
    for (const element of inputElements) {
      const value = getElementHandler(element.type).seed?.(submittedAnswers[element.id])
      if (value !== undefined) seed[element.id] = value
    }
    return seed
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Minimal generic context: element handlers read/write their own value shapes through
  // getValue/setValue, so this never grows a per-element accessor when a type is added.
  const ctx: SurfaceContext = {
    disabled,
    errors,
    getValue: (id) => state[id],
    setValue: (id, value) => setState((prev) => ({ ...prev, [id]: value })),
    submittedAction,
    submit: () => undefined, // assigned below (submit closes over validate/buildDisplayText)
    renderChild: () => null, // assigned below (recursive layout rendering)
  }

  const renderElement = (element: InteractiveElement, key: string): ReactElement | null =>
    getElementHandler(element.type).render(element, key, ctx) ?? null

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    for (const element of inputElements) {
      const error = getElementHandler(element.type).validate?.(element, ctx)
      if (error) next[element.id] = error
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  // A compact one-line summary of the submission (no leading check mark — the chip
  // renders that). Each input contributes its handler summary in layout order; a bare
  // action is shown only when nothing else was answered (a pure Approve/Reject).
  const buildDisplayText = (action: string | null): string => {
    const parts: string[] = []
    for (const element of inputElements) {
      const part = getElementHandler(element.type).summary?.(element, ctx)
      if (part) parts.push(part)
    }
    if (action && parts.length === 0) {
      parts.push(cleanLabel(buttons.find((b) => b.id === action)?.label ?? action))
    }
    return parts.length ? parts.join(' · ') : 'Submitted'
  }

  const submit = (action: string | null) => {
    if (disabled) return
    if (!validate()) return
    const answers: Record<string, unknown> = {}
    for (const element of inputElements) {
      answers[element.id] = getElementHandler(element.type).answer?.(element, ctx)
    }
    onSubmit('submit', { action, answers }, buildDisplayText(action))
  }

  ctx.submit = submit
  ctx.renderChild = renderElement

  return (
    <div className="mt-4 flex flex-col gap-3" data-testid="interactive-surface">
      {surface.map((element, i) => renderElement(element, `el-${i}`))}
      {/* When the surface has no action buttons, a single Submit sends the combined answer. */}
      {buttons.length === 0 && inputElements.length > 0 && (
        <div>
          <Button
            type={ButtonType.PRIMARY}
            size={ButtonSize.SMALL}
            disabled={disabled}
            onClick={() => submit(null)}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  )
}

export default InteractiveSurface
