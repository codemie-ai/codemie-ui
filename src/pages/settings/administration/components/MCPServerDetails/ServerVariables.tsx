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

import { FC } from 'react'

interface ServerVariablesProps {
  variables: Array<{ name: string; description?: string; required?: boolean }>
}

const ServerVariables: FC<ServerVariablesProps> = ({ variables }) => {
  if (variables.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-text-primary mb-2">Variables</h3>
        <p className="text-xs text-text-quaternary">No variables configured</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-text-primary mb-2">
        Variables ({variables.length})
      </h3>
      <div className="flex flex-col gap-3">
        {variables.map((variable) => (
          <div
            key={variable.name}
            className="bg-surface-base-secondary border border-border-structural rounded-lg p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-text-primary">
                {variable.name}
              </span>
              {variable.required && <span className="text-xs text-failed-secondary">Required</span>}
            </div>
            {variable.description && (
              <p className="text-xs text-text-quaternary">{variable.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ServerVariables
