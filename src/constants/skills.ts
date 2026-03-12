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

export const SKILL_INDEX_SCOPES = {
  PROJECT: 'project',
  MARKETPLACE: 'marketplace',
  PROJECT_WITH_MARKETPLACE: 'project_with_marketplace',
} as const

export const SKILL_FILTER_INITIAL_STATE = {
  search: '',
  project: [] as string[],
  created_by: '',
  categories: [] as string[],
  visibility: null,
}

export const SKILLS_SEARCH_DEBOUNCE_DELAY = 300
export const SKILLS_DROPDOWN_LIMIT = 50

export const MAX_SKILL_CATEGORIES = 3
export const MAX_SKILLS_PER_ASSISTANT = 10
export const SKILLS_PER_PAGE = 12
export const MIN_SKILL_NAME_LENGTH = 3
export const MAX_SKILL_NAME_LENGTH = 64
export const MIN_DESCRIPTION_LENGTH = 10
export const MAX_DESCRIPTION_LENGTH = 1000
export const MIN_CONTENT_LENGTH = 100
export const MAX_CONTENT_LENGTH = 30000

export const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/

export const SKILL_EXAMPLE_TEMPLATE = `---
name: example-skill
description: A brief description of what this skill helps with
---

# Example Skill

## Description
This is an example skill that demonstrates the markdown format for importing skills.

## Content
\`\`\`
Your skill content goes here. This can include:
- Instructions for the AI assistant
- Code examples
- Best practices
- Any other relevant information

Example:
When the user asks for help with code review, follow these steps:
1. Analyze the code structure
2. Check for common issues
3. Provide constructive feedback
\`\`\`

You can use markdown formatting including:
- **Bold text**
- *Italic text*
- Lists
- Code blocks
- Links and more
`

export const SKILL_INSTRUCTIONS_PLACEHOLDER = `## Purpose
Describe what this skill helps the assistant accomplish.

## Context
When should this skill be used? What scenarios does it address?

## Instructions
Provide detailed step-by-step instructions for the assistant:

1. **Step 1**: First action to take
2. **Step 2**: Next action
3. **Step 3**: Final steps

## Examples
\`\`\`
// examples or sample interactions
\`\`\`

## Best Practices
- Key point 1
- Key point 2
- Key point 3

## Additional Notes
Any other important information or edge cases to consider.
`
