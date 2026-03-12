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

import { useState, useCallback } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { Provider } from '@/types/entity/provider'
import { copyToClipboard } from '@/utils/utils'

interface ProviderActionsProps {
  provider: Provider
  onViewDetails: (provider: Provider) => void
  onEdit: (provider: Provider) => void
  onDelete: (provider: Provider) => void
}

const ProviderActions = ({ provider, onViewDetails, onEdit, onDelete }: ProviderActionsProps) => {
  const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false)

  const showDeleteConfirmation = useCallback(() => {
    setIsDeleteConfirmationVisible(true)
  }, [])

  const confirmDelete = useCallback(() => {
    setIsDeleteConfirmationVisible(false)
    onDelete(provider)
  }, [provider, onDelete])

  const copyProviderId = useCallback(() => {
    copyToClipboard(provider.id, 'Provider ID copied to clipboard')
  }, [provider.id])

  const menuActions = [
    {
      title: 'View Details',
      icon: <InfoSvg />,
      onClick: () => onViewDetails(provider),
    },
    {
      title: 'Edit',
      icon: <EditSvg />,
      onClick: () => onEdit(provider),
    },
    {
      title: 'Copy ID',
      icon: <CopySvg className="w-[18px] h-3.5" />,
      onClick: copyProviderId,
    },
    {
      title: 'Delete',
      icon: <DeleteSvg />,
      onClick: showDeleteConfirmation,
    },
  ]

  return (
    <div className="flex justify-end">
      <NavigationMore hideOnClickInside renderInRoot items={menuActions} />

      <ConfirmationModal
        visible={isDeleteConfirmationVisible}
        onCancel={() => setIsDeleteConfirmationVisible(false)}
        header="Delete Provider?"
        message={`Are you sure you want to delete "${provider.name}"?`}
        confirmText="Delete"
        confirmButtonType={ButtonType.DELETE}
        confirmButtonIcon={<DeleteSvg className="w-4 mr-px" />}
        onConfirm={confirmDelete}
      >
        <div className="mt-4">
          <p className="text-sm text-text-quaternary">
            This action cannot be undone. The provider will be permanently removed.
          </p>
        </div>
      </ConfirmationModal>
    </div>
  )
}

export default ProviderActions
