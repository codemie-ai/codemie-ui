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

import avatarDefault from '@/assets/images/avatar.jpg'
import { cn } from '@/utils/utils'

interface UserAvatarProps {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-6 w-6 min-w-6',
  md: 'h-8 w-8 min-w-8',
  lg: 'h-10 w-10 min-w-10',
}

const UserAvatar: FC<UserAvatarProps> = ({ src, name, size = 'md', className }) => {
  const avatarSrc = src && src.trim() !== '' ? src : avatarDefault

  return (
    <div
      className={cn('rounded-full flex items-center justify-center', sizeClasses[size], className)}
    >
      <img
        src={avatarSrc}
        alt={name || 'User avatar'}
        className="rounded-full w-full h-full object-cover"
      />
    </div>
  )
}

export default UserAvatar
