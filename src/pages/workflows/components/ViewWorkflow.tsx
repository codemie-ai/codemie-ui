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

import React from 'react'
import { useSearchParams } from 'react-router'

import Tabs from '@/components/Tabs'
import { WORKFLOW_TAB, WorkflowTab } from '@/pages/workflows/constants'
import { Workflow } from '@/types/entity'

import ViewWorkflowConfiguration from './ViewWorkflowConfiguration'
import ViewWorkflowHeader from './ViewWorkflowHeader'
import WorkflowExecutionsTable from './WorkflowExecutionsTable'

interface ViewWorkflowProps {
  workflow: Workflow
}

const ViewWorkflow: React.FC<ViewWorkflowProps> = ({ workflow }) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = (searchParams.get('tab') as WorkflowTab) ?? WORKFLOW_TAB.EXECUTIONS

  const handleTabChange = (tabId: WorkflowTab) => {
    setSearchParams({ tab: tabId })
  }

  const tabsConfig = [
    {
      id: WORKFLOW_TAB.EXECUTIONS,
      label: 'Executions',
      element: <WorkflowExecutionsTable workflow={workflow} />,
    },
    {
      id: WORKFLOW_TAB.CONFIG,
      label: 'Configuration',
      element: <ViewWorkflowConfiguration workflow={workflow} />,
    },
  ]

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto">
      <ViewWorkflowHeader workflow={workflow} />

      <Tabs
        tabs={tabsConfig}
        isEmbedded={false}
        className="overflow-x-visible"
        activeTab={activeTab}
        onChange={handleTabChange}
      />
    </div>
  )
}

export default ViewWorkflow
