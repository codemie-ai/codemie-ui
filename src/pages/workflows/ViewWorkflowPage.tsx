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

import React, { useEffect } from 'react'
import { useSnapshot } from 'valtio'

import PageLayout from '@/components/Layouts/Layout/PageLayout'
import Sidebar from '@/components/Sidebar'
import Spinner from '@/components/Spinner'
import { useVueRoute } from '@/hooks/useVueRouter'
import { goBackWorkflows } from '@/pages/workflows/utils/goBackWorkflows'
import { workflowsStore } from '@/store/workflows'

import ViewWorkflow from './components/ViewWorkflow'
import WorkflowsNavigation from './components/WorkflowsNavigation'

const ViewWorkflowPage: React.FC = () => {
  const route = useVueRoute()
  const { currentWorkflow, currentWorkflowLoading } = useSnapshot(workflowsStore)

  const workflowId = route.params.id as string

  useEffect(() => {
    if (workflowId) {
      workflowsStore.fetchWorkflow(workflowId)
    }

    return () => {
      workflowsStore.clearCurrentWorkflow()
    }
  }, [workflowId])

  const onBack = () => {
    goBackWorkflows()
  }

  return (
    <div className="flex h-full">
      <Sidebar title="Workflows" description="Browse and run available AI-powered workflows">
        <WorkflowsNavigation />
      </Sidebar>
      <PageLayout title="Workflow Details" showBack onBack={onBack}>
        <div className="px-6 pt-8 overflow-x-clip">
          {currentWorkflowLoading && (
            <div className="flex justify-center mt-10">
              <Spinner />
            </div>
          )}

          {!currentWorkflowLoading && currentWorkflow && (
            <ViewWorkflow workflow={currentWorkflow} />
          )}

          {!currentWorkflowLoading && !currentWorkflow && (
            <div className="flex justify-center mt-10">
              <p className="text-text-quaternary">Workflow not found</p>
            </div>
          )}
        </div>
      </PageLayout>
    </div>
  )
}

export default ViewWorkflowPage
