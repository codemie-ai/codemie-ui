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

export const InlineCredentialsContent: React.FC<InlineCredentialsContentProps> = ({
  credentials,
  message = 'This assistant contains inline credentials that will be used by users.',
  showMcpEnvVarsWarning = false,
}) => {
  const formatCredentialType = (credentialType?: string) => {
    if (!credentialType) return 'Unknown'
    return startCase(camelCase(credentialType))
  }

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
              <div className="credential-header flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="credential-type font-medium flex items-center">
                    {formatCredentialType(credential.credential_type)}
                  </span>
                  {credential.integration_alias && (
                    <span className="text-xs text-text-quaternary mt-0.5">
                      {credential.integration_alias}
                    </span>
                  )}
                </div>
                {(() => {
                  if (credential.toolkit) {
                    return (
                      <span className="credential-source text-sm text-text-quaternary flex items-center">
                        {credential.toolkit || ''}
                        {credential.toolkit && credential.label ? ' / ' : ''}
                        {credential.label || ''}
                      </span>
                    )
                  }
                  if (credential.mcp_server) {
                    return (
                      <span className="credential-source text-sm text-text-quaternary flex items-center">
                        {credential.toolkit || ''}
                        {credential.toolkit && credential.mcp_server ? ' / ' : ''}
                        {credential.mcp_server || ''}
                      </span>
                    )
                  }
                  return null
                })()}
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
