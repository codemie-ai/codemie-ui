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
  BANNER_MESSAGE: 'bannerMessage',
  BANNER_LINK_LABEL: 'bannerLinkLabel',
  BANNER_LINK_ROUTE: 'bannerLinkRoute',
} as const

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS]
