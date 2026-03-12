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

import { useEffect } from 'react'

import PlusIcon from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import { ButtonSize } from '@/constants'
import { useVueRouter } from '@/hooks/useVueRouter'
import { WORKFLOW_LIST_SCOPE, WorkflowListScope } from '@/pages/workflows/constants'
import { workflowsStore } from '@/store/workflows'

import WorkflowsFilters from './components/WorkflowsFilters'
import WorkflowsList from './components/WorkflowsList'
import WorkflowsNavigation from './components/WorkflowsNavigation'
import WorkflowTemplates from './components/WorkflowTemplates'

interface WorkflowsListPageProps {
  scope: WorkflowListScope
}

const WorkflowsListPage: React.FC<WorkflowsListPageProps> = ({ scope }) => {
  const router = useVueRouter()

  useEffect(() => {
    workflowsStore.clearWorkflowsFilters()
  }, [scope])

  const createWorkflow = () => {
    router.push({ name: 'new-workflow' })
  }

  const shouldShowFilters = scope === WORKFLOW_LIST_SCOPE.ALL || scope === WORKFLOW_LIST_SCOPE.MY

  return (
    <div className="flex h-full">
      <Sidebar title="Workflows" description="Browse and run available AI-powered workflows">
        <WorkflowsNavigation />
        {shouldShowFilters && <WorkflowsFilters key={scope} scope={scope} />}
      </Sidebar>
      <PageLayout
        rightContent={
          <Button type="primary" size={ButtonSize.MEDIUM} onClick={createWorkflow}>
            <PlusIcon />
            Create Workflow
          </Button>
        }
      >
        <div className="min-h-full flex flex-col pb-24 pt-6">
          {scope === WORKFLOW_LIST_SCOPE.ALL && <WorkflowsList key={scope} scope={scope} />}
          {scope === WORKFLOW_LIST_SCOPE.MY && <WorkflowsList key={scope} scope={scope} />}
          {scope === WORKFLOW_LIST_SCOPE.TEMPLATES && <WorkflowTemplates key={scope} />}
        </div>
      </PageLayout>
    </div>
  )
}

export default WorkflowsListPage
