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

import CopySvg from '@/assets/icons/copy.svg?react'
import avatarFallback from '@/assets/images/avatar.jpg'
import { User } from '@/types/entity/user'
import { copyToClipboard } from '@/utils/helpers'

import InfoCard from './InfoCard'

const ProfileCard: React.FC<{
  user: User
}> = ({ user }) => {
  const copyUserID = async () => {
    copyToClipboard(user?.userId, 'User ID copied to clipboard')
  }

  const icon = () =>
    user?.picture ? (
      <img src={user.picture} alt="User profile" className="h-8 w-8 rounded-full object-cover" />
    ) : (
      <img src={avatarFallback} alt="User profile" className="h-8 w-8 rounded-full" />
    )

  return (
    <InfoCard heading={user?.name || ''} icon={icon}>
      <div className="flex gap-x-1">
        <p className="text-xs text-text-quaternary">{user?.userId}</p>
        <button
          title="Copy user ID"
          className="hover:opacity-80 ml-2"
          type="button"
          onClick={copyUserID}
        >
          <CopySvg className="w-3" />
        </button>
      </div>
    </InfoCard>
  )
}

export default ProfileCard
