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

import { WorkflowExecutionStatus } from '@/types/entity/workflow'

export const WORKFLOW_STATUSES: Record<string, WorkflowExecutionStatus> = {
  SUCCEEDED: 'Succeeded',
  INTERRUPTED: 'Interrupted',
  ABORTED: 'Aborted',
  FAILED: 'Failed',
}

export const WORKFLOW_FINAL_STATUSES = [
  WORKFLOW_STATUSES.SUCCEEDED,
  WORKFLOW_STATUSES.ABORTED,
  WORKFLOW_STATUSES.FAILED,
  WORKFLOW_STATUSES.INTERRUPTED,
]

export const WORKFLOW_OUTPUT_FORMATS = {
  MARKDOWN: 'markdown',
  TEXT: 'text',
}

export const YAML_PLACEHOLDER = `assistants:
  - id: business_analyst # ID of assistant inside this configuration
    assistant_id: 196ede41-e7f0-4658-ae99-1dc0d83c8347 # CodeMie assistant ID
    model: 'gpt-4.1' # Ability to override model
  - id: onboarder
    assistant_id: d09ec675-16db-4aba-901d-1fff17d84692
    model: 'gpt-4.1'
  - id: requirement_analyzer
    assistant_id: 196ede41-e7f0-4658-ae99-1dc0d83c8347
    model: 'gpt-4.1'

states:
  - id: onboarder # ID of state inside this configuration
    assistant_id: onboarder
    task: |
      Find all relevant information about workflow implementation and describe
      like for business analyst as a requirements description.
      Provide a list of main requirement categories to analyze further.
    output_schema: |
      {
        "requirements": "List of main requirement categories"
      }
    next:
      state_id: requirement_analyzer # ID of next state
      iter_key: requirements # Key for iteration, must be same as in schema
  - id: requirement_analyzer # ID of state inside this configuration
    assistant_id: requirement_analyzer
    task: |
      Analyze the given requirement category in detail.
      Provide a comprehensive description for QA engineers, support team, and
      users on how to use this specific aspect of the workflow functionality.
    output_schema: |
      {
        "category": "Name of the requirement category",
        "analysis": "Detailed analysis and description of the requirement"
      }
    next:
      state_id: business_analyst # ID of next state
  - id: business_analyst # ID of state inside this configuration
    assistant_id: business_analyst
    task: |
      Compile all the requirement analyses into a comprehensive description for
      QA engineers, support team, and users on how to use this functionality.
      Create a comment for Jira ticket CODEMIE-1350 with key points.
    output_schema: |
      {
        "success": "Boolean true | false. If you created Jira comment successfully return true, otherwise false",
        "comment_body": "Return comment body which you left in Jira"
      }
    next:
      condition:
        expression: "success == True"
        then: end
        otherwise: business_analyst
`

export const WORKFLOW_VISUAL_EDITOR_FLAG = 'visualWorkflowEditor'
