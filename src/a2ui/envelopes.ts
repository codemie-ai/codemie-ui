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

import {
  A2UI_PROTOCOL_VERSION,
  CREATE_SURFACE,
  UPDATE_COMPONENTS,
  UPDATE_DATA_MODEL,
} from './config'

import type { A2uiEnvelope } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Pre-filter guard for the centralized fallback: returns the first component
 * type referenced by the envelopes that is NOT in `supported` (the renderer's
 * SUPPORTED_COMPONENTS), or null when the whole surface is renderable.
 * Checking up-front keeps the SDK's own inline "unknown component" error text
 * out of the chat. The supported list is passed in (rather than imported from
 * the registry) so this module stays free of renderer/DS dependencies — the
 * chat store imports it too.
 */
export function findUnsupportedComponentType(
  envelopes: readonly A2uiEnvelope[],
  supported: readonly string[]
): string | null {
  for (const envelope of envelopes) {
    if (!isRecord(envelope)) continue
    const update = envelope[UPDATE_COMPONENTS]
    if (!isRecord(update) || !Array.isArray(update.components)) continue
    for (const component of update.components) {
      if (!isRecord(component)) continue
      const type = component.component
      if (typeof type === 'string' && type && !supported.includes(type)) return type
    }
  }
  return null
}

/**
 * Ids of every surface an assistant turn created, in envelope order and without
 * duplicates. They are the keys the chat uses to find the user turn that
 * answered each surface: one message may carry several surfaces, and answer
 * state (prefill, read-only, "replace this turn") is tracked per surface — a
 * first-match-only lookup silently mis-attributes answers to the second one.
 */
export function findCreatedSurfaceIds(envelopes: readonly A2uiEnvelope[]): string[] {
  const ids: string[] = []
  for (const envelope of envelopes) {
    if (!isRecord(envelope)) continue
    const created = envelope[CREATE_SURFACE]
    if (!isRecord(created) || typeof created.surfaceId !== 'string' || !created.surfaceId) continue
    if (!ids.includes(created.surfaceId)) ids.push(created.surfaceId)
  }
  return ids
}

/**
 * True when any envelope payload references the given surface id — used to
 * attribute an answer turn to the assistant message that issued the surface.
 */
export function envelopesContainSurface(
  envelopes: readonly A2uiEnvelope[],
  surfaceId: string
): boolean {
  return envelopes.some(
    (envelope) =>
      isRecord(envelope) &&
      Object.values(envelope).some(
        (payload) => isRecord(payload) && payload.surfaceId === surfaceId
      )
  )
}

/**
 * The ids this message's surfaces use as `Modal.trigger`.
 *
 * Read from the envelopes rather than from the rendered tree: the catalog's own Modal
 * renders the trigger itself, so there is no React boundary to hang the knowledge on, and
 * the Button that IS a trigger has to know not to dispatch its action.
 */
export function findModalTriggerIds(
  envelopes: readonly A2uiEnvelope[] | null | undefined
): Set<string> {
  const triggers = new Set<string>()
  for (const envelope of envelopes ?? []) {
    const update = (envelope as Record<string, unknown>)[UPDATE_COMPONENTS]
    if (!update || typeof update !== 'object') continue
    const {components} = (update as { components?: unknown })
    if (!Array.isArray(components)) continue
    for (const component of components) {
      if (!component || typeof component !== 'object') continue
      const { component: kind, trigger } = component as { component?: unknown; trigger?: unknown }
      if (kind === 'Modal' && typeof trigger === 'string' && trigger) triggers.add(trigger)
    }
  }
  return triggers
}

/**
 * Deep-copies a value into plain JSON objects.
 *
 * Everything crossing this boundary comes off a valtio `useSnapshot`, i.e. a
 * proxy-compare tracking Proxy whose nested values are Proxies too.
 * `structuredClone` throws `DataCloneError` on any Proxy, which would turn every
 * surface into the error fallback. `JSON.parse(JSON.stringify(...))` reads
 * through the proxy get-traps instead and yields plain, mutable objects — and
 * it is lossless here because A2UI envelopes and data models are JSON payloads
 * by definition (they arrive as JSON over the chat stream). Chosen over
 * `getUntracked` from proxy-compare because that package is only a transitive
 * dependency of valtio, not a declared one.
 */
export function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}


/**
 * Brings agent-authored envelopes in line with the catalog before the renderer sees them.
 *
 * Here rather than in a component because these are protocol facts, and the server
 * enforces the same ones on the way back — disagree with it and the user is refused for
 * something they cannot see. Two of them: `variant` defaults to single-choice, and a
 * selection is an array (a re-rendered form seeds scalars).
 */
export function normalizeToCatalog(envelopes: readonly A2uiEnvelope[]): A2uiEnvelope[] {
  const bindingsBySurface = new Map<string, Binding[]>()

  const normalized = envelopes.map((envelope) => {
    const update = (envelope as Record<string, unknown>)[UPDATE_COMPONENTS]
    if (!isRecord(update) || !Array.isArray(update.components)) return envelope
    const surfaceId = typeof update.surfaceId === 'string' ? update.surfaceId : ''
    const bindings = bindingsBySurface.get(surfaceId) ?? []
    bindingsBySurface.set(surfaceId, bindings)

    const components = update.components.map((component) => {
      if (!isRecord(component)) return component
      const declared = isRecord(component.value) ? component.value.path : undefined
      const segments = typeof declared === 'string' ? pathSegments(declared) : []

      if (component.component === 'TextField' || component.component === 'DateTimeInput') {
        // The number variant is excluded: there, empty genuinely means "no number yet".
        if (segments.length && component.variant !== 'number') bindings.push({ kind: 'text', segments })
        return component
      }
      if (component.component !== 'ChoicePicker') return component

      const variant = typeof component.variant === 'string' ? component.variant : 'mutuallyExclusive'
      if (segments.length) {
        bindings.push({
          kind: 'choice',
          segments,
          single: variant === 'mutuallyExclusive',
          options: declaredOptionValues(component.options),
        })
      }
      return { ...component, variant }
    })
    return { ...envelope, [UPDATE_COMPONENTS]: { ...update, components } } as A2uiEnvelope
  })

  const anyBindings = [...bindingsBySurface.values()].some((list) => list.length > 0)
  return anyBindings ? seedDataModel(normalized, bindingsBySurface) : normalized
}

interface Binding {
  kind: 'text' | 'choice'
  /** The binding path split into segments: `/profile/name` becomes ['profile', 'name']. */
  segments: string[]
  single?: boolean
  options?: Set<string>
}

/**
 * Splits a binding path into the segments the data model is keyed by.
 *
 * A path is a JSON pointer, and both the SDK's data model and the server's intake read it
 * as a tree. Treating `/profile/name` as one flat key wrote a key neither side binds, and
 * the server refused it on every submit.
 */
const pathSegments = (path: string): string[] => path.split('/').filter(Boolean)

/** The option values a picker offers; undefined when it declares none usably. */
const declaredOptionValues = (raw: unknown): Set<string> | undefined => {
  const values = Array.isArray(raw)
    ? raw
        .filter(isRecord)
        .map((option) => option.value)
        .filter((value): value is string => typeof value === 'string')
    : []
  return values.length ? new Set(values) : undefined
}

/** Reads the value at a segment path, or undefined when the branch does not exist. */
const readAt = (model: Record<string, unknown>, segments: string[]): unknown =>
  segments.reduce<unknown>((node, segment) => (isRecord(node) ? node[segment] : undefined), model)

/** Writes a value at a segment path, creating branches, without mutating the original. */
const writeAt = (
  model: Record<string, unknown>,
  segments: string[],
  value: unknown
): Record<string, unknown> => {
  const [head, ...rest] = segments
  if (!rest.length) return { ...model, [head]: value }
  const child = isRecord(model[head]) ? model[head] : {}
  return { ...model, [head]: writeAt(child, rest, value) }
}

/**
 * Coerces one choice value into what the catalog (and the server) expect: strings the
 * picker actually offers, each at most once, capped to one for a single-choice picker.
 * A value outside the options can neither be shown nor removed by the user, and the
 * server refuses the whole answer because of it.
 */
const asSelection = (current: unknown, binding: Binding): string[] => {
  let raw: unknown[] = []
  if (Array.isArray(current)) raw = current
  else if (typeof current === 'string' && current) raw = [current]
  const offered = raw.filter(
    (item): item is string =>
      typeof item === 'string' && (!binding.options || binding.options.has(item))
  )
  const deduped = [...new Set(offered)]
  return binding.single ? deduped.slice(0, 1) : deduped
}

/** Compared by content: same-length-but-different is exactly what a length check misses. */
const sameSelection = (current: unknown, next: string[]): boolean =>
  Array.isArray(current) &&
  current.length === next.length &&
  current.every((item, index) => item === next[index])

/**
 * Writes the values the catalog's renderers assume are already there.
 *
 * Scoped per surface: one message may carry several, and applying one surface's bindings
 * to another's data model seeds a key that surface binds nothing under — which the server
 * refuses, leaving both unanswerable.
 */
function seedDataModel(
  envelopes: A2uiEnvelope[],
  bindingsBySurface: Map<string, Binding[]>
): A2uiEnvelope[] {
  const seeded = new Set<string>()

  const patched = envelopes.map((envelope) => {
    const update = (envelope as Record<string, unknown>)[UPDATE_DATA_MODEL]
    if (!isRecord(update) || !isRecord(update.value)) return envelope
    const surfaceId = typeof update.surfaceId === 'string' ? update.surfaceId : ''
    const bindings = bindingsBySurface.get(surfaceId)
    if (!bindings?.length) return envelope
    seeded.add(surfaceId)

    let { value } = update
    let touched = false
    for (const binding of bindings) {
      const current = readAt(value, binding.segments)
      if (binding.kind === 'text') {
        // An empty text input must hold "" rather than nothing: checks are evaluated
        // against this model and the catalog's `regex` function runs test(value), where an
        // absent value stringifies to "undefined" — so a pattern written to accept empty
        // could never match, and an OPTIONAL field opened in an error nobody could clear.
        if (current == null) {
          value = writeAt(value, binding.segments, '')
          touched = true
        }
        continue
      }
      if (current === undefined) continue
      const selection = asSelection(current, binding)
      if (sameSelection(current, selection)) continue
      value = writeAt(value, binding.segments, selection)
      touched = true
    }
    return touched ? ({ ...envelope, [UPDATE_DATA_MODEL]: { ...update, value } } as A2uiEnvelope) : envelope
  })

  const missing = [...bindingsBySurface].filter(
    ([surfaceId, bindings]) =>
      surfaceId && !seeded.has(surfaceId) && bindings.some((binding) => binding.kind === 'text')
  )
  if (!missing.length) return patched

  return [
    ...patched,
    ...missing.map(([surfaceId, bindings]) => {
      let value: Record<string, unknown> = {}
      for (const binding of bindings) {
        if (binding.kind === 'text') value = writeAt(value, binding.segments, '')
      }
      return {
        version: A2UI_PROTOCOL_VERSION,
        [UPDATE_DATA_MODEL]: { surfaceId, path: '/', value },
      } as unknown as A2uiEnvelope
    }),
  ]
}
