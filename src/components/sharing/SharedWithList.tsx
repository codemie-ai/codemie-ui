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
import UserAvatar from '@/components/Avatar/UserAvatar'
import Button from '@/components/Button/Button'
import { ButtonType } from '@/constants'
import { SharedWithUser } from '@/types/entity/sharing'

interface SharedWithListProps {
  users: SharedWithUser[]
  /** When set, rows render in the editable (popup) layout with a Remove button. */
  onRemove?: (userId: string) => void
  removingId?: string | null
  viaLinkNote?: string
}

const ViaLinkBadge = () => <span className="text-xs text-text-quaternary shrink-0">via link</span>

const SharedWithList = ({ users, onRemove, removingId, viaLinkNote }: SharedWithListProps) => {
  if (!onRemove) {
    return (
      <div className="flex flex-col gap-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-2 p-2 -mx-2 rounded-lg w-full">
            <UserAvatar src={user.picture} name={user.name} size="sm" />
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-xs text-text-primary overflow-ellipsis overflow-hidden truncate">
                {user.name}
              </p>
              <p className="text-xs text-text-secondary overflow-ellipsis overflow-hidden truncate">
                {user.email}
              </p>
            </div>
            {user.grant_source === 'link' && <ViaLinkBadge />}
          </div>
        ))}
      </div>
    )
  }

  const hasLinkGrants = users.some((u) => u.grant_source === 'link')

  return (
    <div>
      <p className="text-xs text-text-quaternary mb-2">People With Access</p>
      <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto show-scroll pr-2 -mr-2">
        {users.map((user) => (
          <li key={user.id} className="flex items-center gap-3">
            <UserAvatar src={user.picture} name={user.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-text-secondary truncate">{user.email}</p>
            </div>
            {user.grant_source === 'link' && <ViaLinkBadge />}
            <Button
              variant={ButtonType.BASE}
              onClick={() => onRemove(user.id)}
              disabled={removingId === user.id}
              aria-label={`Remove ${user.name}`}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {hasLinkGrants && viaLinkNote && (
        <p className="text-xs text-text-quaternary mt-2">{viaLinkNote}</p>
      )}
    </div>
  )
}

export default SharedWithList
