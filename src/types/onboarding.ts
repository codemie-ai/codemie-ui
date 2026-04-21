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

import { HelpPageId } from '@/constants/helpLinks'

// Base interface for common properties
interface BaseOnboardingStep {
  id: string
  // Optional condition to determine if step should be shown
  condition?: () => boolean | Promise<boolean>
  // Optional delay before showing/executing step (in milliseconds)
  delay?: number
}

// Suggested flow structure for next steps
export interface SuggestedFlow {
  flowId: string
  emoji: string
  title: string
  description: string
  duration: string
}

// Modal step - User-visible, centered modal (no element highlighting)
export interface ModalStep extends BaseOnboardingStep {
  actionType: 'Modal'
  title: string
  description: string
  content?: React.ReactNode
  // When provided, replaces the entire modal body with a custom rendered component.
  // The footer (Next / Back / Skip buttons) is still rendered by OnboardingModal.
  customRender?: () => React.ReactNode
  // Optional suggested flows to show (typically on last step)
  suggestedNextFlows?: SuggestedFlow[]
}

// Highlight step - User-visible, highlights and explains a UI element
export interface HighlightStep extends BaseOnboardingStep {
  actionType: 'Highlight'
  title: string
  description: string
  target: string | (() => HTMLElement | null)
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  highlightPadding?: number
  content?: React.ReactNode
}

// Code Execution step - Technical step, executes provided function
export interface CodeExecutionStep extends BaseOnboardingStep {
  actionType: 'CodeExecution'
  execute: () => void | Promise<void>
  // Optional reversal handler called when the user navigates back past this step
  onBack?: () => void | Promise<void>
}

// Navigation step - Technical step, navigates to a route
export interface NavigationStep extends BaseOnboardingStep {
  actionType: 'Navigation'
  route: {
    name: string
    params?: Record<string, any>
    query?: Record<string, any>
  }
}

// Discriminated union of all step types
export type OnboardingStep = ModalStep | HighlightStep | CodeExecutionStep | NavigationStep

// Helper type guards
export const isModalStep = (step: OnboardingStep): step is ModalStep => {
  return step.actionType === 'Modal'
}

export const isHighlightStep = (step: OnboardingStep): step is HighlightStep => {
  return step.actionType === 'Highlight'
}

export const isCodeExecutionStep = (step: OnboardingStep): step is CodeExecutionStep => {
  return step.actionType === 'CodeExecution'
}

export const isNavigationStep = (step: OnboardingStep): step is NavigationStep => {
  return step.actionType === 'Navigation'
}

// Check if step is user-visible (Modal or Highlight)
export const isUserVisibleStep = (step: OnboardingStep): step is ModalStep | HighlightStep => {
  return step.actionType === 'Modal' || step.actionType === 'Highlight'
}

// Check if step is technical (CodeExecution or Navigation)
export const isTechnicalStep = (
  step: OnboardingStep
): step is CodeExecutionStep | NavigationStep => {
  return step.actionType === 'CodeExecution' || step.actionType === 'Navigation'
}

// Per-page trigger entry for the HelpPanel popup
export interface HelpPanelPageTrigger {
  // The page ID where the flow appears in the HelpPanel popup
  id: HelpPageId
  // If true, show a popup the first time the user visits this page
  firstTimePopup?: boolean
}

// Controls where a flow is surfaced in the UI beyond the Help page.
// All flows are always accessible from the Help page (Interactive Tours section).
export interface OnboardingFlowTriggers {
  // Pages on which this flow appears in the HelpPanel popup (the ? button, bottom-right corner).
  // Only add page IDs where the flow is directly relevant.
  // Set firstTimePopup: true on a page entry to also show a popup on the user's first visit.
  helpPanelPages?: HelpPanelPageTrigger[]
  // Whether this flow appears in the FirstTimeUserPopup (welcome screen for new SSO users).
  showOnWelcome?: boolean
  // App release versions (e.g. '0.4.7') for which this flow appears in the NewReleasePopup.
  // The flow will surface in the popup whenever the user sees the release notification
  // for any of the listed versions.
  releaseVersions?: string[]
}

// Onboarding flow definition
export interface OnboardingFlow {
  id: string
  name: string
  description?: string
  // Emoji used to visually represent the flow (e.g. '🧭', '🤖')
  emoji?: string
  // Estimated duration shown in the Help page card (e.g. '3-4 min')
  duration?: string
  // Controls where the flow is surfaced beyond the Help page.
  // Omit entirely for broad tours that should only appear on the Help page.
  triggers?: OnboardingFlowTriggers
  steps: OnboardingStep[]
  onStart?: () => void | Promise<void>
  onComplete?: () => void | Promise<void>
}

// Element position for spotlight calculation
export interface ElementPosition {
  top: number
  left: number
  width: number
  height: number
}
