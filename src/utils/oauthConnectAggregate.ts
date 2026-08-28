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

import { ConfluenceConnectRequired, parseConfluenceConnectRequired } from './confluenceAuth'
import { GitLabConnectRequired, parseGitLabConnectRequired } from './gitlabAuth'
import { JiraConnectRequired, parseJiraConnectRequired } from './jiraAuth'

export interface OAuthConnectAggregate {
  gitlab: GitLabConnectRequired | null
  jira: JiraConnectRequired | null
  confluence: ConfluenceConnectRequired | null
}

/**
 * Detects the MCP-style aggregate connect gate a run emits when several shared per-user OAuth
 * integrations the assistant uses are not connected by the acting user:
 *   { error: 'oauth_connect_required', providers: [{ error: 'gitlab_auth_required', ... }, ...] }
 * Each provider entry reuses the single-provider payload shape, so the existing per-provider
 * parsers do the normalization. Returns the set of prompts to render, or null for unrelated payloads.
 */
export const parseOAuthConnectRequired = (value: unknown): OAuthConnectAggregate | null => {
  if (
    typeof value !== 'object' ||
    value === null ||
    (value as { error?: unknown }).error !== 'oauth_connect_required' ||
    !Array.isArray((value as { providers?: unknown }).providers)
  ) {
    return null
  }

  const result: OAuthConnectAggregate = { gitlab: null, jira: null, confluence: null }
  for (const provider of (value as { providers: unknown[] }).providers) {
    result.gitlab = result.gitlab ?? parseGitLabConnectRequired(provider)
    result.jira = result.jira ?? parseJiraConnectRequired(provider)
    result.confluence = result.confluence ?? parseConfluenceConnectRequired(provider)
  }

  return result.gitlab || result.jira || result.confluence ? result : null
}

export const isOAuthConnectRequired = (value: unknown): boolean =>
  parseOAuthConnectRequired(value) !== null
