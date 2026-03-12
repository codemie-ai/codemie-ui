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

export interface MarkdownStep {
  id: number
  title: string
  content: string
  level: number
}

interface ParserState {
  steps: MarkdownStep[]
  currentStep: MarkdownStep | null
  stepId: number
  inCodeBlock: boolean
}

/**
 * Check if a line is a code block delimiter
 */
const isCodeBlockDelimiter = (line: string): boolean => {
  return line.trim().startsWith('```')
}

/**
 * Try to match a markdown header outside of code blocks
 */
const matchHeader = (line: string, inCodeBlock: boolean): RegExpMatchArray | null => {
  if (inCodeBlock) return null
  // Use non-backtracking pattern to avoid ReDoS vulnerability
  return line.match(/^(#{1,6})\s+(.*)/)
}

/**
 * Create a new step from a header match
 */
const createStepFromHeader = (headerMatch: RegExpMatchArray, stepId: number): MarkdownStep => {
  const level = headerMatch[1].length
  const title = headerMatch[2].trim()

  return {
    id: stepId,
    title,
    content: '',
    level,
  }
}

/**
 * Handle content before the first header
 */
const handleIntroContent = (state: ParserState, line: string): void => {
  const hasIntroStep = state.steps.length > 0 && state.steps[0].title === 'Introduction'

  if (!hasIntroStep) {
    const introStep: MarkdownStep = {
      id: state.stepId,
      title: 'Introduction',
      content: line,
      level: 1,
    }
    state.steps.push(introStep)
    state.stepId += 1
    state.currentStep = introStep
  } else {
    state.steps[0].content += '\n' + line
  }
}

/**
 * Process a single line of markdown
 */
const processLine = (line: string, state: ParserState): void => {
  // Toggle code block state
  if (isCodeBlockDelimiter(line)) {
    state.inCodeBlock = !state.inCodeBlock
  }

  const headerMatch = matchHeader(line, state.inCodeBlock)

  if (headerMatch && headerMatch[2]) {
    // Save previous step if exists
    if (state.currentStep) {
      state.steps.push(state.currentStep)
    }
    // Start new step
    state.currentStep = createStepFromHeader(headerMatch, state.stepId)
    state.stepId += 1
  } else if (state.currentStep) {
    // Add content to current step
    state.currentStep.content += (state.currentStep.content ? '\n' : '') + line
  } else if (line.trim()) {
    // Content before first header
    handleIntroContent(state, line)
  }
}

/**
 * Parse markdown content into steps based on headers
 * Headers become step titles, content between headers becomes step content
 * Ignores headers inside code blocks to prevent splitting code
 */
export const parseMarkdownIntoSteps = (markdown: string): MarkdownStep[] => {
  if (!markdown) return []

  const lines = markdown.split('\n')
  const state: ParserState = {
    steps: [],
    currentStep: null,
    stepId: 0,
    inCodeBlock: false,
  }

  // Process each line
  lines.forEach((line) => processLine(line, state))

  // Add last step
  if (state.currentStep) {
    state.steps.push(state.currentStep)
  }

  // Clean up content (trim whitespace)
  return state.steps.map((step) => ({
    ...step,
    content: step.content.trim(),
  }))
}

/**
 * Get progress percentage based on current step
 */
export const calculateStepProgress = (currentStep: number, totalSteps: number): number => {
  if (totalSteps === 0) return 0
  return Math.round(((currentStep + 1) / totalSteps) * 100)
}
