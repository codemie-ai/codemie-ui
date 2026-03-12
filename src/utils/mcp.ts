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
 * MCP (Model Context Protocol) utility functions and constants
 */

/**
 * Color mappings for MCP server categories
 * Each category uses theme-aware semantic colors with the pattern:
 * bg-{color}-secondary text-{color}-main border border-{color}-main
 * This ensures high contrast in both light and dark modes
 */
export const MCP_CATEGORY_COLORS: Record<string, string> = {
  Development: 'bg-in-progress-tertiary text-in-progress-primary border border-in-progress-primary',
  AI: 'bg-interrupted-tertiary text-interrupted-primary border border-interrupted-primary',
  API: 'bg-in-progress-tertiary text-in-progress-primary border border-in-progress-primary',
  Database: 'bg-success-secondary text-success-primary border border-success-primary',
  Cloud: 'bg-interrupted-tertiary text-interrupted-primary border border-interrupted-primary',
  Filesystem: 'bg-aborted-tertiary text-aborted-primary border border-aborted-primary',
  Git: 'bg-failed-tertiary text-failed-secondary border border-failed-secondary',
  Memory: 'bg-interrupted-tertiary text-interrupted-primary border border-interrupted-primary',
  Automation: 'bg-success-secondary text-success-primary border border-success-primary',
  Search: 'bg-aborted-tertiary text-aborted-primary border border-aborted-primary',
  Other: 'bg-surface-elevated text-text-quaternary border border-border-structural',
}

/**
 * Get the Tailwind color classes for a given MCP category
 * @param category - The category name (e.g., 'Development', 'AI', 'Database')
 * @returns Tailwind CSS class string with background, text, and border colors
 * @example
 * getCategoryColor('AI') // returns 'bg-interrupted-tertiary text-interrupted-primary border border-interrupted-primary'
 * getCategoryColor('Unknown') // returns 'bg-surface-elevated text-text-quaternary border border-border-structural' (Other)
 */
export const getCategoryColor = (category: string): string => {
  return MCP_CATEGORY_COLORS[category] || MCP_CATEGORY_COLORS.Other
}
