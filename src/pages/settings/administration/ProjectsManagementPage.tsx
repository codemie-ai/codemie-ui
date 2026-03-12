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
import { useSnapshot } from 'valtio'

import { userStore } from '@/store'

import AdminToolsCard from '../components/AdminToolsCard'
import SettingsLayout from '../components/SettingsLayout'

const ProjectsManagementPage: FC = () => {
  const { user } = useSnapshot(userStore) as typeof userStore

  const renderContent = () => {
    return (
      <div className="settings-cards flex flex-col gap-6 max-w-lg pt-8 gap-x-6">
        {user?.isAdmin ? <AdminToolsCard /> : null}
      </div>
    )
  }

  return <SettingsLayout contentTitle="Projects management" content={renderContent()} />
}

export default ProjectsManagementPage
