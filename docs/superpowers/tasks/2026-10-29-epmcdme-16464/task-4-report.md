DONE
commit: bef5ea1f8
paths: src/utils/api.ts, src/utils/__tests__/api.test.ts
test_command: npx vitest run --project unit src/utils/__tests__/api.test.ts (EXIT=0, 80 passed); npx tsc --noEmit -p . (0 errors)
exports (src/utils/api.ts):
  export interface StreamOptions { errorToast?: boolean }
  export type StreamHttpError = Record<string, any> & { status: number }
signature: stream(url: string, body: any, abortController: AbortController | null = null, method: string = 'POST', options: StreamOptions = {}): Promise<ReadableStreamDefaultReader<string> | Response>
behaviour: on !ok, throws StreamHttpError (parsed JSON body + status, or the SyntaxError + status for non-JSON). errorToast (default true) gates both toasts; auth-gate payloads still never toast.
concerns: logic moved to private buildStreamError (sonar complexity lint). A JSON body that is a non-object (e.g. a string/null) is now thrown as {status} instead of the raw primitive.
