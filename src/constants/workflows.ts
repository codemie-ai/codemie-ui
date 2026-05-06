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
  RUNNING: 'In Progress',
  SUCCEEDED: 'Succeeded',
  INTERRUPTED: 'Interrupted',
  ABORTED: 'Aborted',
  FAILED: 'Failed',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
}

export const WORKFLOW_FINAL_STATUSES = [
  WORKFLOW_STATUSES.SUCCEEDED,
  WORKFLOW_STATUSES.ABORTED,
  WORKFLOW_STATUSES.FAILED,
  WORKFLOW_STATUSES.INTERRUPTED,
  WORKFLOW_STATUSES.AUTHENTICATION_REQUIRED,
]

export const WORKFLOW_OUTPUT_FORMATS = {
  MARKDOWN: 'markdown',
  TEXT: 'text',
}

export const YAML_PLACEHOLDER = `assistants:
  - id: business_analyst # ID of assistant inside this configuration
    model: 'gpt-4.1' # Ability to override model
    system_prompt: |
      You are a business analyst responsible for compiling requirement analyses into
      comprehensive documentation. Your goal is to produce clear, structured descriptions
      for QA engineers, support teams, and end users. When creating Jira comments,
      summarize key points concisely and ensure all stakeholders can understand the feature.
  - id: onboarder
    model: 'gpt-4.1'
    system_prompt: |
      You are an onboarding specialist who gathers and organizes information about
      workflow implementations. Your goal is to understand the scope of work and
      identify the main requirement categories that need further analysis.
      Present findings clearly so a business analyst can work with them.
  - id: requirement_analyzer
    model: 'gpt-4.1'
    system_prompt: |
      You are a requirements analyst who performs deep-dive analysis of individual
      requirement categories. Your goal is to produce detailed, actionable descriptions
      that QA engineers, support teams, and users can rely on to understand and test
      each aspect of the workflow functionality.

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
