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

import { ToolkitType } from '@/constants/assistants'

export interface Tool {
  name: string
  label?: string
  settings_config?: boolean
  user_settings?: UserSetting | null
  user_description?: string
  additionalInformation?: () => React.ReactElement // used locally only
}

export interface Toolkit {
  toolkit: ToolkitType
  label?: string
  settings_config?: boolean
  tools?: Tool[]
  user_settings?: UserSetting | null
}

export interface UserSetting {
  id: string
  alias: string
  setting_type: string
  project_name: string
}

export interface UserMappingSetting {
  credentialType: string
  settingId: string | null
  setting: UserSetting | null
  isToolkit: boolean
  originalName: string
  toolkitName?: string
}

export interface UserMappingSettings {
  [key: string]: UserMappingSetting
}
