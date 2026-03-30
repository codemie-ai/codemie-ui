import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { WorkflowIssue } from '@/types/entity'
import { WorkflowConfiguration } from '@/types/workflowEditor'
import { shouldResolveIssue } from '@/utils/workflowEditor/helpers/issues'

interface UseWorkflowIssuesProps {
  issues?: WorkflowIssue[] | null
  selectedStateId: string | null
  editorConfig: WorkflowConfiguration
}

const useWorkflowIssues = ({ issues, editorConfig }: UseWorkflowIssuesProps) => {
  const [resolvedIssues, setResolvedIssues] = useState<Set<string>>(new Set())
  const [dirtyIssues, setDirtyIssues] = useState<Set<string>>(new Set())

  const markIssueResolved = useCallback(
    (issue: string | WorkflowIssue) =>
      setResolvedIssues((prev) => new Set(prev).add(typeof issue === 'string' ? issue : issue.id)),
    []
  )
  const isIssueResolved = useCallback(
    (issue: string | WorkflowIssue) =>
      resolvedIssues.has(typeof issue === 'string' ? issue : issue.id),
    [resolvedIssues]
  )

  const markIssueDirty = useCallback(
    (issue: string | WorkflowIssue) =>
      setDirtyIssues((prev) => new Set(prev).add(typeof issue === 'string' ? issue : issue.id)),
    []
  )
  const isIssueDirty = useCallback(
    (issue: string | WorkflowIssue) =>
      dirtyIssues.has(typeof issue === 'string' ? issue : issue.id),
    [dirtyIssues]
  )

  const resolveAllDirtyIssues = useCallback(
    () =>
      setResolvedIssues((prev) => {
        dirtyIssues.forEach((issueId) => prev.add(issueId))
        return new Set(prev)
      }),
    [dirtyIssues]
  )

  const clearAllDirtyIssues = useCallback(() => setDirtyIssues(new Set()), [])
  const clearAllResolvedIssues = useCallback(() => setResolvedIssues(new Set()), [])

  const revalidateIssues = useCallback(
    (prevConfig: WorkflowConfiguration, nextConfig: WorkflowConfiguration) => {
      const nextIssues = issues?.map((issue) => ({ ...issue }))
      if (!nextIssues) return

      nextIssues.forEach((issue) => {
        if (isIssueResolved(issue)) return

        if (shouldResolveIssue(issue, prevConfig, nextConfig)) {
          markIssueResolved(issue)
        }
      })
    },
    [issues, isIssueResolved, markIssueResolved]
  )

  const prevEditorConfigRef = useRef<WorkflowConfiguration>(editorConfig)
  useEffect(() => {
    const prevEditorConfig = prevEditorConfigRef.current
    prevEditorConfigRef.current = editorConfig
    revalidateIssues(prevEditorConfig, editorConfig)
  }, [revalidateIssues, editorConfig])

  const issueMethods = useMemo(
    () => ({
      markIssueResolved,
      isIssueResolved,
      markIssueDirty,
      isIssueDirty,
      resolveAllDirtyIssues,
      clearAllDirtyIssues,
      revalidateIssues,
      clearAllResolvedIssues,
      setDirtyIssues,
    }),
    [
      markIssueResolved,
      isIssueResolved,
      markIssueDirty,
      isIssueDirty,
      resolveAllDirtyIssues,
      clearAllDirtyIssues,
      revalidateIssues,
      clearAllResolvedIssues,
    ]
  )

  return useMemo(() => ({ issueMethods }), [issueMethods])
}

export default useWorkflowIssues
