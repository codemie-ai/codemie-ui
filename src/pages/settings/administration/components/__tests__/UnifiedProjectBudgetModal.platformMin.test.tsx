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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ProjectDetail } from '@/types/entity/projectManagement'

import UnifiedProjectBudgetModal, {
  UnifiedProjectBudgetModalProps,
} from '../UnifiedProjectBudgetModal'

const chargebackFlag = vi.fn(() => [true, true] as [boolean, boolean])
const costCentersFlag = vi.fn(() => [true, true] as [boolean, boolean])
const notificationFlag = vi.fn(() => [true, true] as [boolean, boolean])
const emailFlag = vi.fn(() => [false, true] as [boolean, boolean])

vi.mock('@/hooks/useFeatureFlags', () => ({
  useProjectChargebackEnabled: () => chargebackFlag(),
  useFeatureFlag: () => costCentersFlag(),
  useBudgetSoftLimitNotificationEnabled: () => notificationFlag(),
  useBudgetSoftLimitEmailEnabled: () => emailFlag(),
}))

const updateProject = vi.fn()
vi.mock('@/store/projects', () => ({
  projectsStore: {
    updateProject: (...args: unknown[]) => updateProject(...args),
  },
}))

const listProjectBudgetGroups = vi.fn()
const getProjectBudgetGroup = vi.fn()
const updateProjectBudgetGroup = vi.fn()
const createProjectBudgetGroup = vi.fn()
vi.mock('@/store/projectBudgets', () => ({
  projectBudgetsStore: {
    listProjectBudgetGroups: (...a: unknown[]) => listProjectBudgetGroups(...a),
    getProjectBudgetGroup: (...a: unknown[]) => getProjectBudgetGroup(...a),
    updateProjectBudgetGroup: (...a: unknown[]) => updateProjectBudgetGroup(...a),
    createProjectBudgetGroup: (...a: unknown[]) => createProjectBudgetGroup(...a),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children, onSubmit, submitText = 'Submit', headerContent }: any) => {
    if (!visible) return null
    return (
      <dialog open>
        {headerContent}
        {children}
        <button type="button" onClick={onSubmit}>
          {submitText}
        </button>
      </dialog>
    )
  },
}))

const makePlan = (hards: { platform: number; cli: number; premium_models: number }) => ({
  group_id: 'g1',
  name: 'My Budget',
  description: 'desc',
  budget_duration: '30d',
  total_amount: 1000,
  categories: [
    { category: 'platform', max_budget: hards.platform, soft_budget: 0 },
    { category: 'cli', max_budget: hards.cli, soft_budget: 0 },
    { category: 'premium_models', max_budget: hards.premium_models, soft_budget: 0 },
  ],
})

const activePlan = makePlan({ platform: 300, cli: 600, premium_models: 100 })

const makeProject = (overrides: Partial<ProjectDetail> = {}): ProjectDetail =>
  ({
    name: 'p1',
    project_type: 'shared',
    user_count: 1,
    admin_count: 1,
    ...overrides,
  } as ProjectDetail)

function Wrapper(props: Readonly<Omit<UnifiedProjectBudgetModalProps, 'visible' | 'onHide'>>) {
  const [visible, setVisible] = useState(true)
  return <UnifiedProjectBudgetModal {...props} visible={visible} onHide={() => setVisible(false)} />
}

const PLATFORM_HARD = 'Platform hard limit'

const platformHard = () => screen.getByLabelText<HTMLInputElement>(PLATFORM_HARD)

async function renderPopulated(
  props: Partial<Omit<UnifiedProjectBudgetModalProps, 'visible' | 'onHide'>> = {},
  expectedPlatformHard = 300
) {
  render(<Wrapper projectName="p1" project={makeProject()} {...props} />)
  await waitFor(() => expect(getProjectBudgetGroup).toHaveBeenCalled())
  await waitFor(() => expect(platformHard()).toHaveValue(expectedPlatformHard))
}

function dragHandle(startX = 301, endX = -500) {
  const slider = screen.getByRole('slider', { name: 'Budget allocation slider' })
  vi.spyOn(slider, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    width: 1002,
    top: 0,
    height: 48,
    right: 1002,
    bottom: 48,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
  fireEvent.mouseDown(slider, { clientX: startX })
  fireEvent.mouseMove(window, { clientX: endX })
  fireEvent.mouseUp(window)
}

async function enter(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  if (text) await user.type(input, text)
  await user.tab()
}

async function save(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Update Budget' }))
  await waitFor(() => expect(updateProjectBudgetGroup).toHaveBeenCalled())
  return updateProjectBudgetGroup.mock.calls[0][1]
}

describe('UnifiedProjectBudgetModal platform minimum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    chargebackFlag.mockReturnValue([true, true])
    costCentersFlag.mockReturnValue([true, true])
    listProjectBudgetGroups.mockResolvedValue([{ group_id: 'g1', deleted_at: null }])
    getProjectBudgetGroup.mockResolvedValue(activePlan)
    updateProjectBudgetGroup.mockResolvedValue({})
    createProjectBudgetGroup.mockResolvedValue({})
    updateProject.mockResolvedValue({})
  })

  describe.each([
    ['full form', false],
    ['distribution only', true],
  ])('%s', (_mode, distributionOnly) => {
    it('keeps Platform above 0 when its handle is dragged to the far left', async () => {
      const user = userEvent.setup()
      await renderPopulated({ distributionOnly })

      dragHandle()
      await waitFor(() => expect(platformHard().value).toBe('0.10'))
      const payload = await save(user)

      expect(payload.categories.platform.pct).toBe(0.01)
    })

    it('rejects 0, a negative value and an empty Platform hard limit', async () => {
      const user = userEvent.setup()
      await renderPopulated({ distributionOnly })

      await enter(user, PLATFORM_HARD, '0')
      expect(platformHard()).toHaveValue(300)
      await enter(user, PLATFORM_HARD, '-5')
      expect(platformHard()).toHaveValue(300)
      await enter(user, PLATFORM_HARD, '')
      expect(platformHard()).toHaveValue(300)
      const payload = await save(user)

      expect(payload.categories.platform.pct).toBe(30)
    })

    it('raises a sub-minimum positive Platform amount to the minimum share', async () => {
      const user = userEvent.setup()
      await renderPopulated({ distributionOnly })

      await enter(user, PLATFORM_HARD, '0.04')
      await enter(user, 'CLI hard limit', '900')
      const payload = await save(user)

      expect(payload.categories.platform.pct).toBe(0.01)
    })
  })

  it('accepts a $1 Platform hard limit as 0.1%', async () => {
    const user = userEvent.setup()
    await renderPopulated()

    await enter(user, PLATFORM_HARD, '1')
    await enter(user, 'CLI hard limit', '899')
    const payload = await save(user)

    expect(payload.categories.platform.pct).toBe(0.1)
  })

  it('renders a legacy Platform-0 group untouched and saves it unchanged', async () => {
    const user = userEvent.setup()
    getProjectBudgetGroup.mockResolvedValue(
      makePlan({ platform: 0, cli: 900, premium_models: 100 })
    )
    await renderPopulated({}, 0)

    const payload = await save(user)

    expect(payload.categories.platform.pct).toBe(0)
  })

  it('keeps Platform at 0 when handle 1 is dragged on a legacy Premium-100% group', async () => {
    const user = userEvent.setup()
    getProjectBudgetGroup.mockResolvedValue(makePlan({ platform: 0, cli: 0, premium_models: 1000 }))
    await renderPopulated({}, 0)

    expect(() => dragHandle(0)).not.toThrow()
    const payload = await save(user)

    expect(payload.categories.platform.pct).toBe(0)
  })

  it('still allows 0 for CLI hard', async () => {
    const user = userEvent.setup()
    await renderPopulated()

    await enter(user, 'CLI hard limit', '0')
    expect(screen.getByLabelText('CLI hard limit')).toHaveValue(0)
    await enter(user, 'Premium Models hard limit', '700')
    const payload = await save(user)

    expect(payload.categories.cli.pct).toBe(0)
  })

  it('still allows 0 for Premium hard and every soft limit', async () => {
    const user = userEvent.setup()
    await renderPopulated()

    await enter(user, 'Premium Models hard limit', '')
    await enter(user, 'CLI hard limit', '700')
    await enter(user, 'Platform soft limit', '0')
    await enter(user, 'CLI soft limit', '')
    await enter(user, 'Premium Models soft limit', '0')
    const payload = await save(user)

    expect(payload.categories.premium_models.pct).toBe(0)
    expect(payload.categories.platform.soft_budget).toBe(0)
    expect(payload.categories.cli.soft_budget).toBe(0)
    expect(payload.categories.premium_models.soft_budget).toBe(0)
  })

  it('resets to the default 30% and keeps it when Total Budget is lowered', async () => {
    const user = userEvent.setup()
    await renderPopulated()

    dragHandle()
    await user.click(screen.getByRole('button', { name: 'Reset to Default' }))
    const total = document.getElementById('total_budget') as HTMLInputElement
    await user.clear(total)
    await user.type(total, '10')
    await user.tab()
    const payload = await save(user)

    expect(payload.total_amount).toBe(10)
    expect(payload.categories.platform.pct).toBe(30)
  })
})
