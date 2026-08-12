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

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { workflowNameId } from '@/utils/ariaIds'

import WorkflowCard from '../WorkflowCard'

vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/workflows', () => ({
  workflowsStore: { deleteWorkflow: vi.fn(), unpublishWorkflowFromMarketplace: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: { createChat: vi.fn(), startNewChat: vi.fn() } }))
vi.mock('@/store/favorites', () => ({
  favoritesStore: { addFavorite: vi.fn(), removeFavorite: vi.fn() },
}))
vi.mock('@/hooks/useFeatureFlags', () => ({
  useFavoritesEnabled: () => [false],
  useFeatureFlag: () => [false],
}))
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ isDark: false, appearance: { gradients: false } }),
}))
vi.mock('@/hooks/useIsTruncated', () => ({ useIsTruncated: () => false }))
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

const makeWorkflow = (id: string, name: string) => ({
  id,
  slug: `slug-${id}`,
  name,
  user_abilities: ['read', 'update', 'delete'],
  is_global: false,
})

describe('WorkflowCard duplicate DOM id guard', () => {
  it('WorkflowsList-style usage (nameId + custom navigationSlot) renders exactly one element with the shared id', () => {
    const workflow = makeWorkflow('wf-1', 'Alpha Workflow')
    const id = workflowNameId(workflow.id)
    // navigationSlot stands in for <NavigationMore contextId={id} /> — NavigationMore only
    // *references* the id via aria-labelledby, it never renders an element carrying that id.
    render(
      <WorkflowCard
        workflow={workflow}
        nameId={id}
        navigationSlot={<span data-testid="custom-slot" />}
      />
    )
    expect(document.querySelectorAll(`#${id}`).length).toBe(1)
  })

  it('default usage (no nameId, no navigationSlot) via WorkflowActions renders exactly one element with the shared id', () => {
    const workflow = makeWorkflow('wf-2', 'Beta Workflow')
    const id = workflowNameId(workflow.id)
    render(<WorkflowCard workflow={workflow} />)
    expect(document.querySelectorAll(`#${id}`).length).toBe(1)
  })
})
