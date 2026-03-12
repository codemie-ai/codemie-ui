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

import OpenSvg from '@/assets/icons/open.svg?react'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { Application } from '@/types/entity/application'

interface ApplicationCardProps {
  application: Application
  onOpenApplication: (application: Application) => void
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({ application, onOpenApplication }) => {
  const handleOpenClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onOpenApplication(application)
    },
    [application, onOpenApplication]
  )

  const renderAvatar = () => {
    if (application.icon_url) {
      return (
        <img
          src={application.icon_url}
          alt={application.name}
          className="w-[4.5rem] h-[4.5rem] rounded-full object-cover"
        />
      )
    }

    return (
      <div className="min-w-[4.5rem] min-h-[4.5rem] w-[4.5rem] h-[4.5rem] rounded-full bg-surface-base-tertiary flex items-center justify-center">
        <span className="text-gray-500 text-xl font-bold select-none">
          {application.name.substring(0, 2).toUpperCase()}
        </span>
      </div>
    )
  }

  const renderActions = () => {
    return (
      <div className="flex my-1 gap-2">
        <Button variant="action" onClick={handleOpenClick} size="medium">
          <OpenSvg />
          Open
        </Button>
      </div>
    )
  }

  return (
    <Card
      id={application.slug}
      onClick={handleOpenClick}
      title={application.name}
      subtitle={application.created_by ? `by ${application.created_by}` : ''}
      description={application.description}
      avatar={renderAvatar()}
      actions={renderActions()}
    />
  )
}

export default React.memo(ApplicationCard)
