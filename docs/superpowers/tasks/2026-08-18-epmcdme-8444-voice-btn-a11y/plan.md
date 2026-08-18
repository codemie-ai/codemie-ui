# Plan: EPMCDME-8444 — Voice button accessible name

## Requirements

The "Use voice"/"Stop listening" button in `ChatPromptVoiceRecorder` must have an accessible name
so screen readers announce its purpose. When idle: "Use voice". When recording: "Stop listening".
The SVG icons inside are decorative and should be hidden from assistive technology.

## Tasks

### Task 1 — Add aria-label to the voice recorder button

File: `src/pages/chat/components/ChatPrompt/ChatPromptVoiceRecorder.tsx`

- Add `aria-label={isUserSpeaking ? 'Stop listening' : 'Use voice'}` to the `<button>` element
- Add `aria-hidden="true"` to both `<RecordSvg>` and `<StopSvg>` (they are decorative; the button
  label carries the accessible name)

Test-first: yes — render the component in both states and assert
`getByRole('button', { name: 'Use voice' })` and `getByRole('button', { name: 'Stop listening' })`.
