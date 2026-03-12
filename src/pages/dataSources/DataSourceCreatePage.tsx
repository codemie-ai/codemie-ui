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

import { FC, useMemo, useRef, useState, useEffect } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout'
import Sidebar from '@/components/Sidebar'
import { DATASOURCES } from '@/constants/routes'
import { userSettingsStore } from '@/store/userSettings'
import { navigateBack } from '@/utils/helpers'

import DataSourceForm, { DataSourceFormRef } from './components/DataSourceForm/DataSourceForm'

const DataSourceCreatePage: FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const formRef = useRef<DataSourceFormRef>(null)

  const handleClose = () => {
    navigateBack(DATASOURCES)
  }

  const onSubmit = () => {
    if (formRef.current) {
      formRef.current.submit()
    }
  }

  useEffect(() => {
    userSettingsStore.resetIsSettingsIndexed()
  }, [])

  const renderHeaderActions = useMemo(
    () => (
      <div className="flex gap-x-4">
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" disabled={isSubmitting} onClick={onSubmit}>
          <PlusIcon />
          Save
        </Button>
      </div>
    ),
    [handleClose, isSubmitting, onSubmit]
  )

  return (
    <div className="flex h-full">
      <Sidebar title="New DataSource" description="Start indexing your data source">
        <></>
      </Sidebar>
      <PageLayout
        title="Create New DataSource"
        onBack={handleClose}
        rightContent={renderHeaderActions}
        limitWidth={true}
      >
        <DataSourceForm onClose={handleClose} ref={formRef} onSubmittingChange={setIsSubmitting} />
      </PageLayout>
    </div>
  )
}

export default DataSourceCreatePage
