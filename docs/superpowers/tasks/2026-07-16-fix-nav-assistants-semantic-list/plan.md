# Plan: Fix NavigationAssistants Semantic List Structure

## Requirements

Extend the EPMCDME-8466 `ul/li` semantic list fix to the FAQ/Chatbot section of the navigation
sidebar. The previous fix wrapped `NavigationSection` links in `ul > li` — `NavigationAssistants`
renders the same Onboarding (FAQ) and Chatbot assistant links but still uses a flat `div > a` structure.

## Tasks

### Task 1: Wrap NavigationAssistants items in ul/li
Test-first: yes — failing tests for `ul` presence, `li` wrapping, and "no ul when empty".

**Changes:**
- `NavigationAssistants.tsx`: remove `flex flex-col gap-2` from outer `<div>`, add `<ul className="list-none p-0 m-0 flex flex-col gap-2">` around the mapped items, wrap each `<a>` in `<li key={...}>`.
- `NavigationAssistants.test.tsx`: add `describe('semantic list structure')` block with 4 tests.

## Outcome

`NavigationAssistants` now renders a proper `ul > li > a` structure, matching `NavigationSection`.
All 14 `NavigationAssistants` unit tests pass. Pre-existing `Navigation.test.tsx` ESM failure is
unrelated to this change.
