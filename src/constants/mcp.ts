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
 * MCP Feature Constants
 * Centralized constants for MCP server management
 */

// Pagination
export const MCP_DEFAULT_PAGE = 0
export const MCP_DEFAULT_PER_PAGE = 20
export const MCP_MARKETPLACE_PER_PAGE = 20

// UI Constants
export const MCP_SEARCH_DEBOUNCE_MS = 300

// Filter Defaults
export const MCP_DEFAULT_FILTERS = {
  is_public: true,
  active_only: true,
}

// Pagination Options for Dropdown
export const MCP_PAGINATION_OPTIONS = [
  { label: '20 items', value: '20' },
  { label: '50 items', value: '50' },
  { label: '100 items', value: '100' },
]
