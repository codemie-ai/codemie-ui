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

import { ReactNode } from 'react'

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

interface ExpandedYamlShellProps {
  visible: boolean
  onCollapse: () => void
  label?: string
  children: ReactNode
}

const ExpandedYamlShell = ({
  visible,
  onCollapse,
  label = 'YAML Configuration',
  children,
}: ExpandedYamlShellProps) => (
  <Popup
    hideFooter
    hideClose
    isFullWidth
    visible={visible}
    onHide={onCollapse}
    className="h-[90vh] pb-6"
    bodyClassName="!pt-2"
    headerContent={
      <div className="flex w-full items-center justify-between py-1">
        <span className="text-sm font-semibold font-mono text-text-primary">{label}</span>
        <Button variant={ButtonType.SECONDARY} onClick={onCollapse}>
          <CollapseSvg />
          Collapse
        </Button>
      </div>
    }
  >
    <div className="flex h-[calc(90vh-8rem)] flex-col">{children}</div>
  </Popup>
)

export default ExpandedYamlShell
