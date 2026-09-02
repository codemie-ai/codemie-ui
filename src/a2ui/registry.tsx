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
  BASIC_FUNCTIONS,
  ButtonApi,
  CATALOG_ID,
  Catalog,
  DateTimeInputApi,
  IconApi,
  ImageApi,
  reactBasicCatalog,
  VideoApi,
  AudioPlayerApi,
} from './config'
import {
  createBasicImplementation,
  createInputImplementation,
  createMediaImplementation,
  withAccessibility,
  withValidationMessage,
} from './factory'
import {
  AudioPlayerRenderer,
  ButtonRenderer,
  DateTimeInputRenderer,
  IconRenderer,
  ImageRenderer,
  VideoRenderer,
} from './renderers'

import type { ReactComponentImplementation } from './config'

// Imported here rather than by whoever mounts a surface: these are the styles the
// components below need in order to look like anything, and a consumer should not have to
// know that. The `.a2ui-scope` class that scopes them is applied at the mount point.
import './theme.css'

/**
 * Which implementation draws which catalog component.
 *
 * The catalog itself comes from the SDK; this module only records the exceptions and
 * assembles the result, so "what do we still own, and why" is answerable by reading one
 * short file.
 */

const OWN_COMPONENTS: Record<string, ReactComponentImplementation> = {
  // Agent-authored URLs are attacker-controlled under prompt injection. The SDK's media
  // components render them straight away — no sanitization, no referrer policy, no
  // consent — so a surface could make the browser fetch an arbitrary host with the
  // user's IP before they touch anything.
  Image: createMediaImplementation(ImageApi, ImageRenderer),
  Video: createMediaImplementation(VideoApi, VideoRenderer),
  AudioPlayer: createMediaImplementation(AudioPlayerApi, AudioPlayerRenderer),
  // The catalog names icons; the artwork is ours, and the SDK has none of it.
  Icon: createBasicImplementation(IconApi, IconRenderer),
  // A Modal's trigger must open the dialog, not submit the form. The catalog makes
  // `action` required on every Button, so a trigger carries one it must not dispatch —
  // and the SDK's Button dispatches it, ending the turn before the dialog is seen.
  Button: createBasicImplementation(ButtonApi, ButtonRenderer, { ownsAccessibility: true }),
  // The catalog's date input is a bare native control. Ours is the product's picker —
  // same calendar, locale and keyboard behaviour the rest of the app has.
  DateTimeInput: createInputImplementation(DateTimeInputApi, DateTimeInputRenderer),
}

// The SDK's ChoicePicker and Slider accept `validationErrors` and render nothing, so a
// required field blocks submission silently. TextField and CheckBox print their own, and
// wrapping those would show the message twice.
const SWALLOW_VALIDATION_MESSAGES = new Set(['ChoicePicker', 'Slider'])

export const A2UI_COMPONENTS: Record<string, ReactComponentImplementation> = Object.fromEntries(
  [...reactBasicCatalog.components].map(([name, sdk]) => [
    name,
    OWN_COMPONENTS[name] ??
      withAccessibility(SWALLOW_VALIDATION_MESSAGES.has(name) ? withValidationMessage(sdk) : sdk),
  ])
)

/** Builds the runtime Catalog for the MessageProcessor (components + checks functions). */
export function createA2uiCatalog(): Catalog<ReactComponentImplementation> {
  return new Catalog(CATALOG_ID, Object.values(A2UI_COMPONENTS), BASIC_FUNCTIONS)
}
