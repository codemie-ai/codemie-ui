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

import { FC, memo, useCallback, useRef, useState } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'

import DataSourceForm, { DataSourceFormRef } from './DataSourceForm'

interface Props {
  onClose: () => void
  onFormClose: () => void
  index?: DataSourceDetailsResponse | null
  canPartialIndex: boolean
  canFullIndex: boolean
  visible?: boolean
  defaultProject?: string
}

const EditIndexPopup: FC<Props> = ({
  index,
  onClose,
  onFormClose,
  visible = true,
  defaultProject,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<DataSourceFormRef>(null)

  const onSubmit = () => formRef.current?.submit?.()

  const handleCancel = useCallback(() => {
    if (formRef.current?.attemptFormClose) {
      formRef.current.attemptFormClose(onClose)
    } else {
      onClose()
    }
  }, [onClose])

  return (
    <Popup
      hideFooter
      onHide={handleCancel}
      visible={visible}
      className="h-auto w-[600px]"
      bodyClassName="show-scroll"
      header={index ? 'Edit data source' : 'Add new data source'}
      dismissableMask={false}
    >
      <DataSourceForm
        index={index}
        onClose={onFormClose}
        ref={formRef}
        defaultProject={defaultProject}
        onSubmittingChange={setIsSubmitting}
        isPopup
      />
      <div className="flex gap-x-4 mb-5 ml-auto">
        <Button variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button variant="primary" disabled={isSubmitting} onClick={onSubmit}>
          <PlusIcon />
          Create
        </Button>
      </div>
    </Popup>
  )
}

export default memo(EditIndexPopup, (prevProps, nextProps) => {
  if (prevProps.index?.id !== nextProps.index?.id) return false
  if (prevProps.visible !== nextProps.visible) return false
  if (prevProps.canFullIndex !== nextProps.canFullIndex) return false
  if (prevProps.canPartialIndex !== nextProps.canPartialIndex) return false
  return true
})
