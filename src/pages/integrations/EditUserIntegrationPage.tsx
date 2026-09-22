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

import { INTEGRATIONS } from '@/constants/routes'
import { userSettingsStore } from '@/store/userSettings'

import EditSettingPageBase, { EditableSetting } from './components/EditSettingPageBase'

const fetchSetting = (projectName: string, credentialType: string, alias: string) =>
  userSettingsStore.findUserSetting(
    projectName,
    credentialType,
    alias
  ) as Promise<EditableSetting | null>

const updateSetting = (id: string, values: Record<string, unknown>) =>
  userSettingsStore.updateUserSetting(id, values)

const EditUserIntegrationPage = () => (
  <EditSettingPageBase
    title="Edit Integration"
    sidebarTitle="Integrations"
    sidebarDescription="Manage your integrations"
    backRoute={INTEGRATIONS}
    successMessage="Integration updated successfully"
    fetchSetting={fetchSetting}
    updateSetting={updateSetting}
  />
)

export default EditUserIntegrationPage
