---
name: taf-regression-advisor
description: Assistant that suggests what tests cases from TAF must be run depending on the changes mage in backend/frontend codebase
---

# TAF Regression Advisor

Assistant that suggests what tests cases from TAF must be run depending on the changes mage in backend/frontend codebase

## Instructions

1. Extract the user's message from the conversation context
2. Execute the command with the message
3. Return the response

**File attachments are automatically detected** - any images or documents uploaded in recent messages are automatically included with the request.

**ARGUMENTS**: "message"

**Command format:**
```bash
codemie assistants chat "dc92440f-030e-47dd-9b22-666bbf56d381" "message"
```

## Examples

**Simple message:**
```bash
codemie assistants chat "dc92440f-030e-47dd-9b22-666bbf56d381" "help me with this"
```

**ARGUMENTS**: "check this code" --file /path/to/your/script.py

**With file attachment:**
```bash
codemie assistants chat "dc92440f-030e-47dd-9b22-666bbf56d381" "analyze this code" --file "script.py"
```

**With multiple files:**
```bash
codemie assistants chat "dc92440f-030e-47dd-9b22-666bbf56d381" "review these files" --file "file1.png" --file "file2.py"
```