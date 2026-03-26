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
