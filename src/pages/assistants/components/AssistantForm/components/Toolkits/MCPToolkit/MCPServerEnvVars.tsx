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

import React from 'react'

import Input from '@/components/form/Input'
import { cn } from '@/utils/utils'

interface EnvVar {
  name: string
  description: string
  required: boolean
}

interface MCPServerEnvVarsProps {
  envVars: EnvVar[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  errors?: Record<string, string>
  className?: string
}

const MCPServerEnvVars: React.FC<MCPServerEnvVarsProps> = ({
  envVars,
  values,
  onChange,
  errors = {},
  className,
}) => {
  if (!envVars || envVars.length === 0) {
    return null
  }

  const handleChange = (key: string, value: string) => {
    onChange({
      ...values,
      [key]: value,
    })
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-2">
        <h4 className="font-bold text-sm">Settings:</h4>
        <div className="text-xs text-text-quaternary">
          Enter the required environment variables for this MCP server
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {envVars.map((envVar) => (
          <div key={envVar.name} className="flex flex-col gap-1">
            <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
              {/* Key Column */}
              <div className="flex flex-col gap-1 min-w-[200px]">
                <label className="text-sm font-medium text-text-quaternary">
                  Key{envVar.required && '*'}:
                </label>
                <div className="px-3 py-2 bg-surface-elevated border border-border-structural rounded-lg text-sm text-text-quaternary font-mono">
                  {envVar.name}
                </div>
              </div>

              {/* Value Column */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-quaternary">
                  Value{envVar.required && '*'}:
                </label>
                <Input
                  name={envVar.name}
                  value={values[envVar.name] || ''}
                  onChange={(e) => handleChange(envVar.name, e.target.value)}
                  placeholder={envVar.description}
                  error={errors[envVar.name]}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-text-quaternary">
        These values will be stored as a new MCP integration setting
      </div>
    </div>
  )
}

export default MCPServerEnvVars
