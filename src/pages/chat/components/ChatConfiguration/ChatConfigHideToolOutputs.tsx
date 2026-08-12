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

import Switch from '@/components/form/Switch'
import { useChatContext } from '@/pages/chat/hooks/useChatContext'
import { chatsStore } from '@/store/chats'

const ChatConfigHideToolOutputs: FC = () => {
  const { currentChat } = useSnapshot(chatsStore)
  const { hideToolOutputs, setHideToolOutputs } = useChatContext()

  return (
    currentChat && (
      <div className="mt-6 flex flex-col gap-4">
        <h4 className="font-semibold">Tool outputs</h4>
        <Switch
          label="Hide tool outputs"
          labelClassName="font-mono text-sm leading-6"
          value={hideToolOutputs}
          onChange={(e) => setHideToolOutputs(e.target.checked)}
        />
      </div>
    )
  )
}

export default ChatConfigHideToolOutputs
