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
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'

import ConversationCard from './components/ConversationCard'
import ProfileCard from './components/ProfileCard'
import SettingsLayout from './components/SettingsLayout'
import SpendingCard from './components/SpendingCard'
import ThemeToggle from './components/ThemeToggle'

const ProfilePage: FC = () => {
  const { user } = useSnapshot(userStore) as typeof userStore

  const renderContent = () => {
    return (
      <div className="settings-cards flex flex-col gap-6 w-fit max-w-[816px] pt-8 gap-x-6">
        <ProfileCard user={user!} />
        {isEnterpriseEdition() && <SpendingCard />}
        <ConversationCard />
        <ThemeToggle />
      </div>
    )
  }

  return <SettingsLayout contentTitle="Profile" content={renderContent()} />
}

export default ProfilePage
