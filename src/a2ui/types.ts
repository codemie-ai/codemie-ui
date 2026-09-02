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
 * Wire-level A2UI types shared between the chat store, the history mapping and
 * the renderer layer. Envelopes are treated as opaque versioned payloads — the
 * MessageProcessor (@a2ui/web_core) owns their full schema.
 */

/** One server→client A2UI envelope (createSurface | updateComponents | updateDataModel | ...). */
export interface A2uiEnvelope {
  version: string
  [messageType: string]: unknown
}

/** The user action reported back to the agent inside a regular chat request. */
export interface A2uiAction {
  name: string
  surfaceId: string
  sourceComponentId?: string
  context?: Record<string, unknown>
}

/** Client→server action envelope (`a2uiAction` field of the chat request). */
export interface A2uiActionEnvelope {
  version: string
  action: A2uiAction
}

/** Snapshot of a surface's client-side data model (`a2uiDataModel` field). */
export type A2uiDataModel = Record<string, unknown>
