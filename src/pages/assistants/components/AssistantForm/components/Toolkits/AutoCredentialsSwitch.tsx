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

import Switch from '@/components/form/Switch'

interface AutoCredentialsSwitchProps {
  isAutoMode: boolean
  onChange: (isAuto: boolean) => void
}

export const AutoCredentialsSwitch = ({ isAutoMode, onChange }: AutoCredentialsSwitchProps) => (
  <Switch
    label="Automatic Credentials Lookup"
    labelClassName="font-geist-mono text-sm text-text-primary whitespace-nowrap"
    hint={
      isAutoMode
        ? 'Each user will use their own integration automatically. Recommended for shared assistants.'
        : 'Uses this specific integration. Other users may not have access to it. Not recommended for shared assistants.'
    }
    value={isAutoMode}
    onChange={(e) => onChange(e.target.checked)}
  />
)
