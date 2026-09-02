# Backend Handoff: `tool_call_policy` field

**Ticket:** EPMCDME-13903

## Summary

Replace the existing boolean `require_confirmation` with a string enum `tool_call_policy` across assistant config, conversation, and chat generation request. This supports three states instead of two.

## Enum values

```
'ask_for_approval' | 'auto_approve' | 'approve_for_me'
```

## Changes needed

### 1. Assistant `tool_permissions`

Replace `require_confirmation: boolean` with `tool_call_policy: string`.

```json
// before
"tool_permissions": { "require_confirmation": true, "allow_override": true }

// after
"tool_permissions": { "tool_call_policy": "ask_for_approval", "allow_override": true }
```

### 2. Conversation entity

Add `tool_call_policy` to the conversation (GET + PATCH), so the user's chosen policy persists across reloads.

```json
// GET /api/v1/conversations/{id} response
{ "tool_call_policy": "ask_for_approval" }

// PATCH /api/v1/conversations/{id} body
{ "tool_call_policy": "auto_approve" }
```

Default: `"ask_for_approval"`.

### 3. Chat generation request

Replace `require_confirmation: boolean` with `tool_call_policy: string` on `POST /api/v1/chat`.

```json
// before
{ "require_confirmation": true }

// after
{ "tool_call_policy": "ask_for_approval" }
```
