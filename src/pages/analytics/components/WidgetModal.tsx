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

import { FC, ReactNode } from 'react'

import Popup from '@/components/Popup'

interface WidgetModalProps {
  visible: boolean
  onHide: () => void
  title: string
  description?: string
  children: ReactNode
}

const WidgetModal: FC<WidgetModalProps> = ({ visible, onHide, title, description, children }) => {
  return (
    <Popup
      visible={visible}
      onHide={onHide}
      headerContent={title}
      hideFooter
      className="w-[95vw] h-[90vh]"
      bodyClassName="show-scroll"
      dismissableMask
    >
      <div className="flex flex-col h-full">
        {description && <p className="text-sm text-text-quaternary mb-4">{description}</p>}
        <div className="flex-1">{children}</div>
      </div>
    </Popup>
  )
}

export default WidgetModal
