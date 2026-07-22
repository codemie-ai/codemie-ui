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

import type {
  CheckBoxElement,
  DatePickerElement,
  DropdownElement,
  InteractiveElement,
  MultipleChoiceElement,
  TextFieldElement,
} from '@/types/entity/interactive'

import type { ReactElement } from 'react'

/**
 * The generic contract between the surface and its element handlers. The surface owns a
 * single opaque state map keyed by element id; each handler stores/reads a value of the
 * shape it alone understands via `getValue`/`setValue`, so NO per-element accessor or
 * mutator lives on the surface and adding an element type never grows this interface.
 */
export interface SurfaceContext {
  disabled: boolean
  errors: Record<string, string>
  getValue: (id: string) => unknown
  setValue: (id: string, value: unknown) => void
  submit: (action: string | null) => void
  /** The action id of a prior submission, so a button can mark itself selected. */
  submittedAction?: string
  renderChild: (element: InteractiveElement, key: string) => ReactElement | null
}

/**
 * One handler per catalog element type — the FE counterpart of the backend registry.
 * `render` draws the widget; input elements also provide `seed` (initial state from a
 * prior answer), `validate` (client error or null), `answer` (its slice of the combined
 * submit payload) and `summary` (its chip text). Adding an element type = add a handler
 * + its metadata in registry.ts; the generic surface needs no change.
 */
export interface ElementHandler<E extends InteractiveElement = InteractiveElement> {
  render: (element: E, key: string, ctx: SurfaceContext) => ReactElement | null
  seed?: (priorAnswer: unknown) => unknown
  validate?: (element: E, ctx: SurfaceContext) => string | null
  answer?: (element: E, ctx: SurfaceContext) => unknown
  summary?: (element: E, ctx: SurfaceContext) => string | null
}

/** Any element that carries an answer id (contributes a value/selection to the submit). */
export type AnswerableElement =
  | MultipleChoiceElement
  | DropdownElement
  | DatePickerElement
  | TextFieldElement
  | CheckBoxElement

/**
 * Maps each element type to a handler for that EXACT element type, so wiring a handler
 * to the wrong key is a compile error — no `never` escape hatch that hides mismatches.
 */
export type HandlerMap = {
  [K in InteractiveElement['type']]: ElementHandler<Extract<InteractiveElement, { type: K }>>
}
