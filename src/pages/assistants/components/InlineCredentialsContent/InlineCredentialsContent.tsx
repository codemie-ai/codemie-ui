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

import camelCase from 'lodash/camelCase'
import startCase from 'lodash/startCase'
import React from 'react'

import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { ToolkitType } from '@/constants/assistants'
import ToolkitIcon from '@/pages/assistants/components/ToolkitIcon'

export interface InlineCredential {
  credential_type?: string
  toolkit?: string | null
  label?: string
  mcp_server?: string | null
  env_vars?: string[] | null
  integration_alias?: string | null
}

interface InlineCredentialsContentProps {
  credentials: InlineCredential[]
  message?: string
  showMcpEnvVarsWarning?: boolean
}

// Friendly labels for the technical MCP credential_type strings emitted by the backend
// validation (see _check_mcp_server_credentials); without this they render as raw
// humanized types like "Mcp Inline Config Env".
const MCP_TYPE_LABELS: Record<string, string> = {
  mcp_inline_config_env: 'Inline environment variables',
  mcp_environment_vars: 'Environment variables',
  mcp_auth_token: 'Authentication token',
}

export const InlineCredentialsContent: React.FC<InlineCredentialsContentProps> = ({
  credentials,
  message = 'This assistant contains inline credentials that will be used by users.',
  showMcpEnvVarsWarning = false,
}) => {
  const formatCredentialType = (credentialType?: string) => {
    if (!credentialType) return 'Unknown'
    return startCase(camelCase(credentialType))
  }

  const isMcpTechnicalType = (credential: InlineCredential) =>
    Boolean(MCP_TYPE_LABELS[credential.credential_type ?? ''])

  // A server pinned to a personal integration is surfaced with the real integration's
  // credential_type plus its alias (the integration name), rather than one of the technical
  // MCP credential_type strings.
  const isPinnedIntegration = (credential: InlineCredential) =>
    Boolean(
      credential.mcp_server && credential.integration_alias && !isMcpTechnicalType(credential)
    )

  // Name (primary, bold) of the row:
  // - pinned integration -> the integration name (alias);
  // - MCP inline/auth (base config) -> the server name;
  // - non-MCP toolkit tool -> its label;
  // - fallback -> the friendly / humanized type.
  const getCredentialName = (credential: InlineCredential) => {
    if (isPinnedIntegration(credential)) return credential.integration_alias
    if (isMcpTechnicalType(credential) && credential.mcp_server) return credential.mcp_server
    return (
      credential.label ||
      MCP_TYPE_LABELS[credential.credential_type ?? ''] ||
      formatCredentialType(credential.credential_type)
    )
  }

  // Type (secondary) of the row, shown on the right:
  // - pinned integration -> the real integration type (e.g. "Jira");
  // - everything else -> the toolkit the backend attached ("MCP", "Project Management", ...).
  const getCredentialType = (credential: InlineCredential) => {
    if (isPinnedIntegration(credential)) return formatCredentialType(credential.credential_type)
    return credential.toolkit || formatCredentialType(credential.credential_type)
  }

  // Reuse the same data-driven icon registry the assistant view uses for TOOLS & CAPABILITIES
  // (ToolkitsViewList -> ToolkitIcon), keyed by the toolkit string the backend attaches to each
  // credential ("MCP" for MCP servers, the toolkit name for toolkit tools). Unknown/absent
  // toolkits fall back to the registry's default cog icon, so non-MCP rows never regress.
  const getIconToolkitType = (credential: InlineCredential) =>
    (credential.toolkit || undefined) as ToolkitType | undefined

  const hasMcpEnvVars = credentials.some((c) => c.mcp_server && c.env_vars && c.env_vars.length > 0)

  if (!credentials.length) return null

  return (
    <div className="mb-6">
      <h3 className="text-base text-text-quaternary font-medium mb-2">Credential Review</h3>
      <p className="text-sm mb-4">{message}</p>

      <div className="mb-4">
        <InfoWarning
          type={InfoWarningType.WARNING}
          message="Inline credentials will not be visible to other users, but will be used for integration purposes."
        />
        {showMcpEnvVarsWarning && hasMcpEnvVars && (
          <div className="mt-2">
            <InfoWarning
              type={InfoWarningType.ERROR}
              message="MCP server environment variables will be visible to other users."
            />
          </div>
        )}
        <div className="credentials-list mt-4 border border-border-tertiary rounded-md overflow-hidden">
          {credentials.map((credential, index) => (
            <div
              key={index}
              className="credential-item p-3 border-b border-border-tertiary last:border-0 flex flex-col"
            >
              <div className="credential-header flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="credential-icon shrink-0 [&>svg]:size-5 text-text-quaternary">
                    <ToolkitIcon toolkitType={getIconToolkitType(credential) as ToolkitType} />
                  </span>
                  <span className="credential-type font-medium truncate">
                    {getCredentialName(credential)}
                  </span>
                </div>
                <span className="credential-source text-sm text-text-quaternary shrink-0 flex items-center">
                  {getCredentialType(credential)}
                </span>
              </div>

              {credential.env_vars && credential.env_vars.length > 0 && (
                <div className="credential-env-vars mt-1">
                  <span className="env-vars-label text-sm flex items-center">
                    Environment variables:
                  </span>
                  <div className="env-var-list flex flex-wrap gap-1 mt-1">
                    {credential.env_vars.map((envVar, envIndex) => (
                      <span
                        key={envIndex}
                        className="env-var-item bg-surface-specific-dropdown-hover text-text-primary text-xs px-2 py-1 rounded"
                      >
                        {envVar}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
