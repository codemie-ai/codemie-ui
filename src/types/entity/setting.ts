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

export interface SettingCredentialValue {
  key: string
  value: string | boolean
}

interface BaseSetting {
  user_id: string
  id: string
  date: string
  alias: string
  credential_type: string
  credential_key?: string
  update_date: string
  project_name: string
  default: boolean
  credential_values: SettingCredentialValue[]
  setting_hash: string | null
  is_global: boolean
  [key: string]: unknown
}

export interface UserSetting extends BaseSetting {
  setting_type: 'user'
}

export interface ProjectSetting extends BaseSetting {
  setting_type: 'project'
}

export type Setting = UserSetting | ProjectSetting
