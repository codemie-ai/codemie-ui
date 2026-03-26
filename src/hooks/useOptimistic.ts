import { useCallback, useState, useRef } from 'react'

type SetOptimistic<TState> = (
  update: TState | ((current: TState) => TState),
  asyncFn: () => Promise<void>
) => Promise<void>

type UseOptimisticReturn<TState> = [TState, SetOptimistic<TState>]
type PendingOp<TState> = { id: number; updater: (state: TState) => TState }

/**
 * Optimistic updates hook with automatic rollback on error
 *
 * @param state - The actual state value (source of truth)
 * @returns [optimisticState, setOptimistic] - The optimistic state and update function
 */
const useOptimistic = <TState>(state: TState): UseOptimisticReturn<TState> => {
  const [pendingOps, setPendingOps] = useState<PendingOp<TState>[]>([])
  const idRef = useRef(0)

  const optimisticState = pendingOps.reduce((current, op) => op.updater(current), state)

  const setOptimistic: SetOptimistic<TState> = useCallback(async (update, asyncFn) => {
    const id = idRef.current
    idRef.current += 1

    const updater =
      typeof update === 'function' ? (update as (state: TState) => TState) : () => update

    setPendingOps((ops) => [...ops, { id, updater }])

    try {
      await asyncFn()
      setPendingOps((ops) => ops.filter((op) => op.id !== id))
    } catch (error) {
      setPendingOps((ops) => ops.filter((op) => op.id !== id))
      throw error
    }
  }, [])

  return [optimisticState, setOptimistic]
}

export default useOptimistic
