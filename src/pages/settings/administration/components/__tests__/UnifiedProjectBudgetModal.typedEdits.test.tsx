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
  default: ({
    visible,
    children,
    onSubmit,
    submitText = 'Submit',
    submitDisabled,
    headerContent,
  }: any) => {
    if (!visible) return null
    return (
      <dialog open>
        {headerContent}
        {children}
        <button type="button" onClick={onSubmit} disabled={submitDisabled}>
          {submitText}
        </button>
      </dialog>
    )
  },
}))

const activePlan = {
  group_id: 'g1',
  name: 'My Budget',
  description: 'desc',
  budget_duration: '30d',
  total_amount: 1000,
  categories: [
    { category: 'platform', max_budget: 300, soft_budget: 200 },
    { category: 'cli', max_budget: 600, soft_budget: 400 },
    { category: 'premium_models', max_budget: 100, soft_budget: 50 },
  ],
}

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
const CLI_HARD = 'CLI hard limit'
const PREMIUM_HARD = 'Premium Models hard limit'
const PLATFORM_SOFT = 'Platform soft limit'
const CLI_SOFT = 'CLI soft limit'
const PREMIUM_SOFT = 'Premium Models soft limit'

const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label)

async function renderPopulated() {
  render(<Wrapper projectName="p1" project={makeProject()} />)
  await waitFor(() => expect(getProjectBudgetGroup).toHaveBeenCalled())
  await waitFor(() => expect(field(PLATFORM_HARD)).toHaveValue(300))
}

async function enter(user: ReturnType<typeof userEvent.setup>, label: string, text: string) {
  const input = screen.getByLabelText(label)
  await user.clear(input)
  if (text) await user.type(input, text)
  await user.tab()
}

function dragHandle(startX: number, endX: number) {
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

async function save(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Update Budget' }))
  await waitFor(() => expect(updateProjectBudgetGroup).toHaveBeenCalled())
  return updateProjectBudgetGroup.mock.calls[0][1]
}

function expectValues(expected: Record<string, number>) {
  Object.entries(expected).forEach(([label, value]) => {
    expect(field(label)).toHaveValue(value)
  })
}

const UNCHANGED_SOFTS = { [PLATFORM_SOFT]: 200, [CLI_SOFT]: 400, [PREMIUM_SOFT]: 50 }

describe('UnifiedProjectBudgetModal typed edits', () => {
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

  describe('a typed Hard Limit changes only its own category', () => {
    it.each([
      [PLATFORM_HARD, '500', { [PLATFORM_HARD]: 500, [CLI_HARD]: 600, [PREMIUM_HARD]: 100 }],
      [CLI_HARD, '200', { [PLATFORM_HARD]: 300, [CLI_HARD]: 200, [PREMIUM_HARD]: 100 }],
      [PREMIUM_HARD, '400', { [PLATFORM_HARD]: 300, [CLI_HARD]: 600, [PREMIUM_HARD]: 400 }],
    ])('%s = %s leaves the peer Hard Limits unchanged', async (label, text, expected) => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, label, text)

      expectValues(expected)
    })

    it.each([
      [CLI_HARD, { [PLATFORM_HARD]: 300, [CLI_HARD]: 0, [PREMIUM_HARD]: 100 }],
      [PREMIUM_HARD, { [PLATFORM_HARD]: 300, [CLI_HARD]: 600, [PREMIUM_HARD]: 0 }],
    ])('%s = 0 moves its share to no other category', async (label, expected) => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, label, '0')

      expectValues(expected)
    })

    it('keeps a value above the remaining share instead of clamping it', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PREMIUM_HARD, '2000')

      expectValues({ [PLATFORM_HARD]: 300, [CLI_HARD]: 600, [PREMIUM_HARD]: 2000 })
    })
  })

  describe('a typed Hard Limit rescales no Soft Limit', () => {
    it('keeps the typed category soft when its hard grows', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PREMIUM_HARD, '200')

      expectValues(UNCHANGED_SOFTS)
    })

    it('keeps the typed category soft and flags it when its hard drops below it', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, CLI_HARD, '300')

      expectValues(UNCHANGED_SOFTS)
      expect(screen.getByText('Exceeds hard limit')).toBeInTheDocument()
    })

    it('keeps every soft when the current Hard Limit is entered again', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, CLI_HARD, '600')

      expectValues(UNCHANGED_SOFTS)
    })
  })

  describe('out-of-balance distribution', () => {
    it('shows how far below the Total Budget the limits are and blocks submit', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, CLI_HARD, '0')

      expect(
        screen.getByText(
          'Category limits are $600 below the Total Budget (40%). Adjust the values to total 100%.'
        )
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Budget' })).toBeDisabled()
    })

    it('shows how far above the Total Budget the limits are and blocks submit', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, CLI_HARD, '700')

      expect(
        screen.getByText(
          'Category limits are $100 above the Total Budget (110%). Adjust the values to total 100%.'
        )
      ).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Update Budget' })).toBeDisabled()
    })

    it('rebalances to 100% when a handle is dragged from an over-100% state', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PREMIUM_HARD, '300')
      expect(screen.getByText(/Category limits are \$200 above/)).toBeInTheDocument()

      dragHandle(301, 401)
      await waitFor(() => expect(screen.queryByText(/Category limits are/)).toBeNull())
      const payload = await save(user)

      const { platform, cli, premium_models: premium } = payload.categories
      expect(Math.abs(platform.pct + cli.pct + premium.pct - 100)).toBeLessThanOrEqual(0.5)
    })
  })

  // The bar draws bands normalized to their sum; inner width is 1000px from x=1,
  // so a visual percentage v sits at clientX = 1 + v * 10.
  describe('dragging from an unbalanced distribution', () => {
    const atVisualPct = (v: number) => Math.round(1 + v * 10)

    it('grabs the handle drawn under the cursor, not the raw-percentage one', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PREMIUM_HARD, '1000')
      // Raw 30/60/100 (sum 190) is drawn as 15.79 / 31.58 / 52.63.
      const h2 = ((30 + 60) / 190) * 100
      dragHandle(atVisualPct(h2), atVisualPct(h2 + 10))
      await waitFor(() => expect(screen.queryByText(/Category limits are/)).toBeNull())
      const payload = await save(user)

      const { platform, cli, premium_models: premium } = payload.categories
      expect(platform.pct).toBeCloseTo((30 / 190) * 100, 1)
      expect(Math.abs(cli.pct - (h2 + 10 - (30 / 190) * 100))).toBeLessThanOrEqual(0.5)
      expect(Math.abs(platform.pct + cli.pct + premium.pct - 100)).toBeLessThanOrEqual(0.05)
    })

    it('keeps Platform at or above its minimum when Premium exceeds the Total Budget', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PREMIUM_HARD, '2000')
      const h1 = (30 / 290) * 100
      dragHandle(atVisualPct(h1), atVisualPct(h1 - 50))
      await waitFor(() => expect(screen.queryByText(/Category limits are/)).toBeNull())
      const payload = await save(user)

      const { platform, cli, premium_models: premium } = payload.categories
      expect(platform.pct).toBeGreaterThanOrEqual(0.01)
      expect(cli.pct).toBeGreaterThanOrEqual(0)
      expect(premium.pct).toBeGreaterThanOrEqual(0)
      expect(Math.abs(platform.pct + cli.pct + premium.pct - 100)).toBeLessThanOrEqual(0.05)
    })

    it('keeps Platform at its minimum on a CLI/Premium drag from a far-over-100% state', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PLATFORM_HARD, '0.1')
      await enter(user, PLATFORM_SOFT, '0.05')
      await enter(user, PREMIUM_HARD, '1500')
      // Raw 0.01/60/150 (sum 210.01) draws Platform at ~0.005%, which round2 would save as 0.
      const h2 = ((0.01 + 60) / 210.01) * 100
      dragHandle(atVisualPct(h2), atVisualPct(h2 + 10))
      await waitFor(() => expect(screen.queryByText(/Category limits are/)).toBeNull())
      const payload = await save(user)

      const { platform, cli, premium_models: premium } = payload.categories
      expect(platform.pct).toBeGreaterThanOrEqual(0.01)
      expect(cli.pct).toBeGreaterThanOrEqual(0)
      expect(premium.pct).toBeGreaterThanOrEqual(0)
      expect(Math.abs(platform.pct + cli.pct + premium.pct - 100)).toBeLessThanOrEqual(0.05)
    })

    it('rebalances with the CLI/Premium handle when Platform exceeds the Total Budget', async () => {
      const user = userEvent.setup()
      await renderPopulated()

      await enter(user, PLATFORM_HARD, '2000')
      // Raw 200/60/10 (sum 270) is drawn as 74.07 / 22.22 / 3.70.
      const p = (200 / 270) * 100
      const h2 = (260 / 270) * 100
      dragHandle(atVisualPct(h2), atVisualPct(h2 - 10))
      await waitFor(() => expect(screen.queryByText(/Category limits are/)).toBeNull())
      const payload = await save(user)

      const { platform, cli, premium_models: premium } = payload.categories
      expect(platform.pct).toBeCloseTo(p, 1)
      expect(cli.pct).toBeGreaterThan(5)
      expect(premium.pct).toBeGreaterThan(5)
      expect(Math.abs(platform.pct + cli.pct + premium.pct - 100)).toBeLessThanOrEqual(0.05)
    })
  })
})
