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

import { SUPPORTED_COMPONENTS , A2UI_PROTOCOL_VERSION, basicCatalog, CATALOG_ID } from './config'

/**
 * Renderer capability manifest — the frontend side of the BE↔FE contract
 * test (backend asserts its enabled components are a subset of ours and the
 * catalog ids match).
 *
 * The committed snapshot `a2ui-manifest.json` is what the backend reads; it is
 * produced by `npm run a2ui:manifest`. Only DOM-free modules are imported here
 * so the generator can run in plain Node.
 */
export interface A2uiManifest {
  catalogId: string
  protocolVersion: string
  components: string[]
  /**
   * Properties each component accepts, per the catalog package this renderer is built
   * against. Component names alone proved too coarse: the two SDKs are versioned
   * independently, so one side can gain a property the other has never heard of, and the
   * backend would then advertise to the model something the renderer silently ignores.
   */
  componentProperties: Record<string, string[]>
  /** Stable hash of the sorted component composition and its properties. */
  compositionHash: string
}

/** Injected by the binder from the component's own `checks` — never authored by an agent. */
const BINDER_INJECTED_PROPS = new Set(['isValid', 'validationErrors'])

function catalogProperties(): Record<string, string[]> {
  const apis = basicCatalog as unknown as Record<string, { schema?: { shape?: object } }>
  const supported = new Set(SUPPORTED_COMPONENTS)
  const properties: Record<string, string[]> = {}
  for (const [exportName, api] of Object.entries(apis)) {
    const component = exportName.replace(/Api$/, '')
    if (exportName === component || !supported.has(component) || !api?.schema?.shape) continue
    properties[component] = Object.keys(api.schema.shape)
      .filter((name) => !BINDER_INJECTED_PROPS.has(name))
      .sort((a, b) => a.localeCompare(b))
  }
  return properties
}

/** FNV-1a 32-bit — tiny, dependency-free, deterministic across runs/platforms. */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5
  /* eslint-disable no-plusplus, no-bitwise -- FNV-1a is defined in terms of xor
     and unsigned 32-bit wraparound; expressing it any other way would change the
     hash the BE/FE contract test compares. */
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  /* eslint-enable no-plusplus, no-bitwise */
  return hash.toString(16).padStart(8, '0')
}

export function getManifest(): A2uiManifest {
  const components = [...SUPPORTED_COMPONENTS].sort((a, b) => a.localeCompare(b))
  const componentProperties = catalogProperties()
  const composition = components
    .map((name) => `${name}(${(componentProperties[name] ?? []).join(',')})`)
    .join('|')
  return {
    catalogId: CATALOG_ID,
    protocolVersion: A2UI_PROTOCOL_VERSION,
    components,
    componentProperties,
    compositionHash: fnv1aHex(composition),
  }
}
