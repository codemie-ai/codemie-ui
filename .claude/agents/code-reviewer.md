---
name: code-reviewer
description: Use this agent when you need to review React/TypeScript code for quality, security, performance, and maintainability issues in the CodeMie UI codebase. Handles the full review workflow — checks for existing review spec, reviews changed files, saves findings to a local spec file, discusses, fixes, and creates a commit with a review marker.
tools: Bash, Glob, Grep, Read, Edit, Write, Task
model: inherit
color: purple
---

This is a thin wrapper. Full implementation is in `.claude/skills/code-reviewer/SKILL.md`.

When invoked as a sub-agent (e.g. by dark-factory), context is provided in the prompt.
Follow `.claude/skills/code-reviewer/SKILL.md` — auto-fix mode activates automatically when `auto-fix: true` is passed.
