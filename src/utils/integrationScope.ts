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
 * Scope of a settings-backed entity: owned by one user, or shared with a project.
 * Reusable by any page that offers a User/Project split.
 */
export enum IntegrationScope {
  USER = 'user',
  PROJECT = 'project',
}

/** The same two values as plain strings, for props fed from API data or route params. */
export type IntegrationScopeValue = `${IntegrationScope}`

/** Narrows a plain scope string (route param, API field) to the enum. */
export const toIntegrationScope = (v: IntegrationScopeValue): IntegrationScope =>
  v === IntegrationScope.PROJECT ? IntegrationScope.PROJECT : IntegrationScope.USER

/** Scope filter value meaning "every scope"; not a scope an integration can be created in. */
export const SCOPE_ALL = 'all'
export type ScopeFilterValue = typeof SCOPE_ALL | IntegrationScope

export const SCOPE_LABEL: Record<IntegrationScope, string> = {
  [IntegrationScope.USER]: 'User',
  [IntegrationScope.PROJECT]: 'Project',
}

/**
 * Parses a `?scope=` value for a list filter. Unknown, mis-cased or forbidden values
 * never error: project-capable people fall back to 'all', members to 'user'.
 */
export function parseScopeFilter(raw: unknown, canUseProject: boolean): ScopeFilterValue {
  if (!canUseProject) return IntegrationScope.USER
  return raw === IntegrationScope.USER || raw === IntegrationScope.PROJECT ? raw : SCOPE_ALL
}

/** Form scope for people who can use project scope: 'project' only when exactly 'project', else 'user'. */
export function parseProjectCapableFormScope(raw: unknown): IntegrationScope {
  return raw === IntegrationScope.PROJECT ? IntegrationScope.PROJECT : IntegrationScope.USER
}

/** Form scope for members: always 'user', whatever was requested. */
export function parseMemberFormScope(): IntegrationScope {
  return IntegrationScope.USER
}

/** Value to put in the address/request; undefined at 'all'. */
export function scopeFilterParam(v: ScopeFilterValue): IntegrationScope | undefined {
  return v === SCOPE_ALL ? undefined : v
}
