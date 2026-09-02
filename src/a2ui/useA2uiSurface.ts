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

import { useMemo, useRef } from 'react'

import { componentChecksPass } from './checks'
import {
  A2UI_PROTOCOL_VERSION,
  DataContext,
  MessageProcessor,
  SUPPORTED_COMPONENTS,
  UPDATE_DATA_MODEL,
} from './config'
import { findUnsupportedComponentType, normalizeToCatalog, toPlainJson } from './envelopes'
import { createA2uiCatalog } from './registry'

import type {
  A2uiMessage,
  ReactComponentImplementation,
  SurfaceModel,
} from './config'
import type { A2uiDataModel, A2uiEnvelope } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Component id the A2UI renderer always mounts as the surface's root. */
const ROOT_COMPONENT_ID = 'root'

/**
 * Evaluates a TextField's `validationRegexp` — the catalog's own per-field pattern,
 * which is separate from `checks` and which the backend advertises to the model.
 *
 * It is enforced here rather than only painted in the renderer so that it actually
 * blocks submission, which is what "client-side validation of the input" means. The
 * pattern is agent-authored: an invalid one is ignored rather than thrown, since a
 * broken pattern must never lock the user out of their own form. (Executing it in the
 * browser adds no new exposure — the catalog's own `regex` check function, which the
 * SDK evaluates the same way, already does exactly this.)
 */
const componentPatternPasses = (
  context: DataContext,
  component: { properties?: Record<string, unknown> }
): boolean => {
  const pattern = component.properties?.validationRegexp
  if (typeof pattern !== 'string' || !pattern) return true
  const bound = component.properties?.value
  if (!isRecord(bound) || typeof bound.path !== 'string') return true
  try {
    const resolved = context.resolveDynamicValue(bound as never)
    // Only a scalar can be matched against a pattern: `String(value)` on an object would
    // hand the regex "[object Object]" and test THAT, which passes or fails for reasons
    // that have nothing to do with what the user typed.
    const text = typeof resolved === 'string' || typeof resolved === 'number' ? String(resolved) : ''
    // An empty field is "not filled in yet", not "wrongly formatted": emptiness is what
    // `checks`/`required` are for, and failing it here would open optional fields in error.
    if (!text) return true
    return new RegExp(pattern).test(text)
  } catch {
    return true
  }
}

export function isSurfaceValid(surface: SurfaceModel<ReactComponentImplementation>): boolean {
  const context = new DataContext(surface, '/')
  return Array.from(surface.componentsModel.entries).every(
    ([, component]) => componentChecksPass(context, component) && componentPatternPasses(context, component)
  )
}

/** A user action raised by a surface, enriched with that surface's data model. */
export interface A2uiSurfaceActionEvent {
  name: string
  surfaceId: string
  sourceComponentId: string
  context?: Record<string, unknown>
  /** Snapshot of the surface's full client data model at dispatch time. */
  dataModel: A2uiDataModel
}

export type A2uiActionHandler = (event: A2uiSurfaceActionEvent) => void

export interface A2uiSurfaceState {
  surfaces: SurfaceModel<ReactComponentImplementation>[]
  /** First component type outside SUPPORTED_COMPONENTS, if any (pre-filtered). */
  unsupportedComponent: string | null
  /** True when the MessageProcessor rejected the envelopes. */
  error: boolean
  /**
   * True when a surface was created but its `root` component never resolved —
   * a stream cut short by Stop, or an agent that named its root something else.
   * The SDK renders a gray "[Loading root...]" for that; the chat degrades to
   * the fallback instead.
   */
  missingRoot: boolean
}

const EMPTY_STATE: A2uiSurfaceState = Object.freeze({
  surfaces: [],
  unsupportedComponent: null,
  error: false,
  missingRoot: false,
})

/**
 * Replays a message's envelopes through a fresh MessageProcessor and hands back the
 * resulting surfaces.
 *
 * A new processor every time, so a list that grows during streaming replays without
 * "surface already exists". See `toPlainJson` for why the envelopes are copied first.
 */
export function useA2uiSurface(
  envelopes: readonly A2uiEnvelope[] | null | undefined,
  onAction?: A2uiActionHandler,
  /**
   * Data models of already submitted answers, keyed by surface id. Each is
   * replayed on top of the server envelopes as one extra `updateDataModel` for
   * its own surface, so a read-only (answered) surface shows exactly what the
   * user submitted — and an unanswered sibling surface keeps its own defaults.
   */
  prefillDataModels?: Record<string, A2uiDataModel> | null
): A2uiSurfaceState {
  // Latest-handler ref: handler identity must not retrigger the replay.
  const handlerRef = useRef(onAction)
  handlerRef.current = onAction

  return useMemo(() => {
    if (!envelopes?.length) return EMPTY_STATE

    const unsupportedComponent = findUnsupportedComponentType(envelopes, SUPPORTED_COMPONENTS)
    if (unsupportedComponent) {
      return { surfaces: [], unsupportedComponent, error: false, missingRoot: false }
    }

    const surfaces: SurfaceModel<ReactComponentImplementation>[] = []
    const processor = new MessageProcessor<ReactComponentImplementation>(
      [createA2uiCatalog()],
      (action) => {
        const surface = surfaces.find((candidate) => candidate.id === action.surfaceId)
        // getClientDataModel() only reports surfaces with sendDataModel:true,
        // which the backend does not set — read the surface data model directly.
        const dataModel = (surface?.dataModel.get('/') ?? {}) as A2uiDataModel
        handlerRef.current?.({
          name: action.name,
          surfaceId: action.surfaceId,
          sourceComponentId: action.sourceComponentId,
          context: action.context,
          dataModel,
        })
      },
      { version: A2UI_PROTOCOL_VERSION }
    )
    processor.onSurfaceCreated((surface) => surfaces.push(surface))

    try {
      processor.processMessages(normalizeToCatalog(toPlainJson(envelopes)) as unknown as A2uiMessage[])
      const prefills = surfaces.flatMap((surface) => {
        const saved = prefillDataModels?.[surface.id]
        if (!saved) return []
        return [
          {
            version: A2UI_PROTOCOL_VERSION,
            [UPDATE_DATA_MODEL]: { surfaceId: surface.id, path: '/', value: toPlainJson(saved) },
          },
        ]
      })
      if (prefills.length) processor.processMessages(prefills as unknown as A2uiMessage[])
    } catch (error) {
      console.error('[a2ui] failed to process envelopes', error)
      return { surfaces: [], unsupportedComponent: null, error: true, missingRoot: false }
    }

    const missingRoot = surfaces.some((surface) => !surface.componentsModel.get(ROOT_COMPONENT_ID))

    return { surfaces, unsupportedComponent: null, error: false, missingRoot }
  }, [envelopes, prefillDataModels])
}
