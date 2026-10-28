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
 * Config item IDs for non-boolean runtime config values from GET /v1/config
 */
export const CONFIG_KEYS = {
  IDP_PROVIDER: 'idpProvider',
  MCP_AUTH_ORIGIN: 'mcpAuthOrigin',
  MCP_AUTH_TIMEOUT_SECONDS: 'mcpAuthTimeoutSeconds',
  BANNER: 'banner',
  ALLOWED_IMAGE_DOMAINS: 'allowedImageDomains',
  CHAT_DISCLAIMER: 'chatDisclaimer',
  RELEASE_NOTES_RECENT_COUNT: 'releaseNotesRecentCount',
  MARKETPLACE_THRESHOLDS: 'marketplaceThresholds',
  MARKETPLACE_CORE_GATES: 'marketplaceCoreGates',
  MARKETPLACE_POLISH_GATES: 'marketplacePolishGates',
  MARKETPLACE_CONSOLIDATION: 'marketplaceConsolidation',
  MARKETPLACE_SIMILARITY: 'marketplaceSimilarity',
} as const

/** Marketplace audit settings: edited on the Marketplace Config tab, hidden from Customer Configuration. */
export const MARKETPLACE_CONFIG_KEYS: ReadonlySet<string> = new Set<string>([
  CONFIG_KEYS.MARKETPLACE_THRESHOLDS,
  CONFIG_KEYS.MARKETPLACE_CORE_GATES,
  CONFIG_KEYS.MARKETPLACE_POLISH_GATES,
  CONFIG_KEYS.MARKETPLACE_CONSOLIDATION,
  CONFIG_KEYS.MARKETPLACE_SIMILARITY,
])

export const MARKETPLACE_TAB_KEYS: ReadonlySet<string> = new Set<string>([
  CONFIG_KEYS.MARKETPLACE_THRESHOLDS,
  CONFIG_KEYS.MARKETPLACE_CORE_GATES,
  CONFIG_KEYS.MARKETPLACE_POLISH_GATES,
  CONFIG_KEYS.MARKETPLACE_SIMILARITY,
])

export const SETTING_SAVED_MESSAGE =
  'Setting saved. New sessions pick it up within a minute; open tabs on the next reload.'
export const SETTING_SAVE_FAILED_MESSAGE = 'Failed to save the setting'
export const SETTING_RESET_MESSAGE = 'Setting reset to the deployment default'
export const SETTING_RESET_FAILED_MESSAGE = 'Failed to reset the setting'

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS]
