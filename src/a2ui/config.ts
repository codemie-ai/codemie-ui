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

/**
 * The single place this client names an A2UI protocol version.
 *
 * The version appears in three unrelated-looking forms, and all three live here
 * so that moving to a new protocol version is one file's worth of edits:
 *
 *   - the wire envelope version, sent in every message (`A2UI_PROTOCOL_VERSION`);
 *   - the published catalog's id, which uses the spec *family* segment `v0_9`
 *     rather than the patch version, because 0.9.1 is a patch of v0_9 and the
 *     catalog is identified by the family URL (`CATALOG_ID`);
 *   - the SDK entry points, where the version is a path segment resolved at
 *     build time rather than a value — hence the re-exports below.
 *
 * Nothing outside this module imports `@a2ui/*` directly: the versioned import
 * paths are the frontend's half of the contract with the backend's
 * `core/a2ui/catalog.py`, and scattering them makes a version bump a search
 * problem instead of a single edit. Import SDK symbols from here.
 */

import * as basicCatalogModule from '@a2ui/web_core/v0_9/basic_catalog'

/** Wire envelope version emitted/accepted by this client (backend WIRE_VERSION). */
export const A2UI_PROTOCOL_VERSION = 'v0.9.1'

/** Canonical id of the A2UI v0.9 Basic Catalog (all 18 components). */
export const CATALOG_ID = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'

// --- SDK re-exports: the renderer and the protocol machinery --------------

export { A2uiSurface, createComponentImplementation } from '@a2ui/react/v0_9'
export type { ReactComponentImplementation } from '@a2ui/react/v0_9'

/**
 * The SDK's own implementations of all 18 catalog components, as a ready catalog.
 *
 * Named `reactBasicCatalog` to keep it apart from `basicCatalog` below, which is the
 * web_core schema module the manifest generator reads: one is React components, the other
 * is zod schemas, and they share the upstream name.
 */
export { basicCatalog as reactBasicCatalog } from '@a2ui/react/v0_9'

export { Catalog, DataContext, MessageProcessor } from '@a2ui/web_core/v0_9'
export type {
  A2uiMessage,
  ComponentApi,
  ComponentContext,
  SurfaceModel,
} from '@a2ui/web_core/v0_9'

// --- SDK re-exports: the Basic Catalog component descriptors --------------

export {
  AudioPlayerApi,
  BASIC_FUNCTIONS,
  ButtonApi,
  CardApi,
  CheckBoxApi,
  ChoicePickerApi,
  ColumnApi,
  DateTimeInputApi,
  DividerApi,
  IconApi,
  ImageApi,
  ListApi,
  ModalApi,
  RowApi,
  SliderApi,
  TabsApi,
  TextApi,
  TextFieldApi,
  VideoApi,
} from '@a2ui/web_core/v0_9/basic_catalog'

/**
 * The whole catalog module as a namespace, for `manifest.ts`, which enumerates
 * the exported zod schemas rather than naming components one by one.
 */
export const basicCatalog = basicCatalogModule

// --- The wire vocabulary ---------------------------------------------------

/**
 * The A2UI message kinds, named once.
 *
 * The protocol renames these in v1.0, so nothing else spells them out — a rename has one
 * site rather than a search across the module. The backend keeps the same rule in
 * `core/a2ui/envelopes.py`, and both sides have a test that fails if a literal reappears.
 */
export const CREATE_SURFACE = 'createSurface'
export const UPDATE_COMPONENTS = 'updateComponents'
export const UPDATE_DATA_MODEL = 'updateDataModel'

// --- The components this renderer draws ------------------------------------

/**
 * Component names this renderer draws — the frontend half of the BE↔FE catalog contract.
 *
 * Written out rather than derived from the registry so that the manifest generator
 * (`npm run a2ui:manifest`) can read it without pulling in the design system or a DOM.
 * The registry's test asserts this list stays identical to the keys of `A2UI_COMPONENTS`,
 * so an implementation added or removed there cannot drift from it.
 */
export const SUPPORTED_COMPONENTS: readonly string[] = Object.freeze(
  [
    'AudioPlayer',
    'Button',
    'Card',
    'CheckBox',
    'ChoicePicker',
    'Column',
    'DateTimeInput',
    'Divider',
    'Icon',
    'Image',
    'List',
    'Modal',
    'Row',
    'Slider',
    'Tabs',
    'Text',
    'TextField',
    'Video',
  ].sort((a, b) => a.localeCompare(b))
)
