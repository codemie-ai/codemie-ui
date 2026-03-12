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

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import Input from '@/components/form/Input'
import Popup from '@/components/Popup'
import { VALIDATION_MESSAGES } from '@/constants/validation'
import { chatsStore } from '@/store/chats'

interface FolderFormPopupPopup {
  isEditing?: boolean
  folder?: string
  isVisible: boolean
  onHide: () => void
  onCreate?: (folderName: string) => void
}

const FolderFormPopup = ({
  isEditing,
  folder,
  isVisible,
  onHide,
  onCreate,
}: FolderFormPopupPopup) => {
  const { createFolder, renameChatFolder } = useSnapshot(chatsStore)

  const formSchema = Yup.object({
    folderName: Yup.string().trim().required(VALIDATION_MESSAGES.FOLDER_NAME_REQUIRED),
  })
  const { control, setValue, handleSubmit } = useForm({
    mode: 'all',
    shouldUnregister: true,
    resolver: yupResolver(formSchema),
    defaultValues: {
      folderName: folder ?? '',
    },
  })

  const onSubmit = handleSubmit(async ({ folderName }) => {
    if (isEditing && folder) {
      await renameChatFolder(folder, folderName)
    } else {
      await createFolder(folderName)
    }

    onCreate?.(folderName)
    onHide()
  })

  useEffect(() => {
    if (isVisible && isEditing) {
      setValue('folderName', folder ?? '')
    }
  }, [isEditing, isVisible])

  const popupHeader = isEditing ? 'Edit folder name' : 'Create new folder'
  const popupSubmit = isEditing ? 'Save' : 'Create'

  return (
    <Popup
      limitWidth
      submitText={popupSubmit}
      header={popupHeader}
      visible={isVisible}
      onHide={onHide}
      withBorderBottom={false}
      onSubmit={onSubmit}
    >
      <Controller
        name="folderName"
        control={control}
        render={({ field, fieldState }) => (
          <Input placeholder="Folder name" error={fieldState.error?.message} {...field} />
        )}
      />
    </Popup>
  )
}

export default FolderFormPopup
