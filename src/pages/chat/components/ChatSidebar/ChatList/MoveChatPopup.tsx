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
import { AutoComplete } from 'primereact/autocomplete'
import { useMemo, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useSnapshot } from 'valtio'
import * as Yup from 'yup'

import FolderSvg from '@/assets/icons/folder-add.svg?react'
import Button from '@/components/Button'
import Autocomplete from '@/components/form/Autocomplete'
import Popup from '@/components/Popup'
import { DEFAULT_CHAT_FOLDER } from '@/constants/chats'
import { VALIDATION_MESSAGES } from '@/constants/validation'
import { chatsStore } from '@/store/chats'
import { ChatListItem } from '@/types/entity/conversation'
import { FilterOption } from '@/types/filters'

import FolderFormPopup from '../FolderList/FolderFormPopup'

interface MoveChatPopupProps {
  isVisible: boolean
  selectedChat?: ChatListItem
  onHide: () => void
  onMove: (folderName: string) => void
}

const MoveChatPopup = ({ isVisible, selectedChat, onHide, onMove }: MoveChatPopupProps) => {
  const autocompleteRef = useRef<AutoComplete<FilterOption>>(null)
  const { moveChatToFolder, chatFolders } = useSnapshot(chatsStore)

  const [isFolderFormPopupVisible, setIsFolderFormPopupVisible] = useState(false)

  const formSchema = Yup.object({
    targetFolder: Yup.string().required(VALIDATION_MESSAGES.FOLDER_NAME_REQUIRED),
  })

  const { control, handleSubmit, setValue } = useForm({
    mode: 'all',
    shouldUnregister: true,
    resolver: yupResolver(formSchema),
    defaultValues: {
      targetFolder: '',
    },
  })

  const folderOptions = useMemo(() => {
    const options = chatFolders
      .map(({ name }) => ({
        label: name,
        value: name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    const isDefaultOptIncluded = options.find((item) => item.value === DEFAULT_CHAT_FOLDER)
    if (!isDefaultOptIncluded) {
      options.unshift({ label: DEFAULT_CHAT_FOLDER, value: DEFAULT_CHAT_FOLDER })
    }

    return options.filter((option) => option.value !== selectedChat?.folder)
  }, [chatFolders, selectedChat])

  const onSubmit = handleSubmit(async ({ targetFolder }) => {
    if (selectedChat) {
      await moveChatToFolder(selectedChat.id, targetFolder)
      onHide()
      onMove(targetFolder)
    }
  })

  return (
    <>
      <Popup
        limitWidth
        withBorderBottom={false}
        visible={isVisible}
        header="Move to folder"
        onHide={onHide}
        onSubmit={onSubmit}
        submitText="Move"
      >
        <Controller
          name="targetFolder"
          control={control}
          render={({ field, fieldState }) => (
            <Autocomplete
              value={field.value}
              ref={autocompleteRef}
              onChange={field.onChange}
              options={folderOptions}
              placeholder="Select folder"
              error={fieldState.error?.message}
              panelFooterTemplate={
                <Button
                  className="w-full mb-2"
                  variant="secondary"
                  onClick={() => {
                    autocompleteRef.current?.hide()
                    setIsFolderFormPopupVisible(true)
                  }}
                >
                  <FolderSvg />
                  Create Folder
                </Button>
              }
            />
          )}
        />
      </Popup>

      <FolderFormPopup
        isVisible={isFolderFormPopupVisible}
        onHide={() => setIsFolderFormPopupVisible(false)}
        onCreate={(newFolderName) => {
          setValue('targetFolder', newFolderName)
          setIsFolderFormPopupVisible(false)
        }}
      />
    </>
  )
}

export default MoveChatPopup
