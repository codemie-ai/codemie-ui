# Chat Interface & First Conversation

**Name**: Chat Interface & First Conversation
**Description**: Learn how to use the chat interface, start conversations with assistants, and organize your chat history
**Target Audience**: New users who completed navigation tour
**Estimated Duration**: 4-5 minutes
**Triggers**:
  - Help Panel Pages: chat (firstTimePopup: true)
  - Show on Welcome: true
  - Release Versions: none

---

## Step 1: Welcome

**Title**: Welcome to Chat Interface
**Action Type**: Modal

**Message**:
```
Welcome to the Chat Interface tour!

In this guide, you'll learn how to:
- Start conversations with assistants
- Use group chats with multiple assistants
- Attach files and configure tools per conversation
- Share and export your chats
- Organize conversations with folders

Let's get started!
```

---

## Tech Step: Start Chat with Onboarding Assistant

**Action Type**: Code Execution
**Code Action**: Navigate to AssistantChatStartPage using the onboarding assistant slug and a short introductory prompt. This creates a new chat with the onboarding assistant and auto-sends the prompt, producing a user message and an AI response in the chat history before the tour continues.

---

## Step 2: New Chat Button

**Title**: Start a New Conversation
**Action Type**: Highlight
**Target**: "New Chat" button in the top-right of the chat sidebar

**Message**:
```
Click "New Chat" to start a fresh conversation at any time.

You can also use this button in the top header when the sidebar is collapsed.

Tip: To continue with the same assistant from your current chat, use the "New Chat with Same Assistant" button in the chat header.
```

---

## Step 3: Recent Assistants & Workflows

**Title**: Quick Access to Assistants & Workflows
**Action Type**: Highlight
**Target**: Assistants and Workflows sections at the top of the chat sidebar listing recently used assistants and workflows

**Message**:
```
Your most recently used assistants and workflows appear here for quick access.

Click any item to instantly start a new chat with it.

The ⋮ menu next to each assistant lets you:
- Start a new chat
- View assistant details
- Edit the assistant
- Remove it from your recents list

The ⋮ menu for workflows offers:
- Start a new chat
- View workflow details

Use the "Explore Assistants" and "Explore Workflows" links below each section to browse the full catalog.
```

---

## Step 4: Your Message

**Title**: Your Messages in the Chat
**Action Type**: Highlight
**Target**: User message (the sent message) in the chat history

**Message**:
```
This is your message in the conversation history. Hover over it to reveal quick actions:

- Copy: copies the message text to your clipboard
- Edit: modify the message and regenerate the AI response from that point
- Resend: re-send the same message to get a fresh response
- Delete: remove the message and all subsequent messages in the thread

Tip: Editing a message discards all responses that came after it, letting you explore a different direction in the conversation.
```

---

## Step 5: AI Response Actions

**Title**: Working with AI Responses
**Action Type**: Highlight
**Target**: AI assistant response in the chat history, including the action bar below it

**Message**:
```
Every AI response comes with a set of actions shown below it:

- Copy: copies the full response to your clipboard (with rich text formatting)
- Edit: refine the response inline and save your changes
- Export (↗ icon): download this single response as Word (DOCX), PDF, or PowerPoint (PPTX)
- 👍 / 👎: rate the response to help improve the assistant

If the assistant generated multiple response variants, use the left/right arrows to navigate between them.
```

---

## Step 6: Chat Input Field

**Title**: Type Your Messages Here
**Action Type**: Highlight
**Target**: Chat message input field at the bottom of the screen

**Message**:
```
Type your message in this input field. Press Enter to send, or Shift+Enter for a new line.

This is a group chat — you can talk to multiple assistants in a single conversation.

To address an assistant, type @ and select one from the list. The first message in a new chat must always use @ to specify an assistant. All follow-up messages go to the most recently mentioned assistant.

Tip: Only one assistant can be mentioned per message.
```

---

## Step 7: Attach Files

**Title**: Attach Files to Your Message
**Action Type**: Highlight
**Target**: Paperclip (file attachment) icon in the bottom-left of the chat input toolbar

**Message**:
```
Click the paperclip icon to attach files to your message.

Supported formats:
- Images: JPEG, JPG, PNG, GIF
- Documents: PDF, PPTX
- Data: CSV (up to 100 MB per file)

Once uploaded, files stay accessible throughout the conversation — no need to re-upload them for follow-up questions.

Tip: You can also paste files directly into the input field.
```

---

## Step 8: Tools Settings (Conditional)

**Title**: Configure Tools for This Chat
**Action Type**: Highlight
**Target**: Sliders icon (Tools Settings) in the chat input toolbar, next to the file attachment button
**Condition**: Only show if Web Search or Code Interpreter feature is enabled

**Message**:
```
Click the sliders icon to open Tools Settings for this conversation.

Available tools (when enabled by your admin):
- Web Search: lets the assistant search the web for up-to-date information
- Code Interpreter: lets the assistant write and run Python code for data analysis and calculations

The badge on the icon shows how many tools are currently active.

Your tool settings are saved per conversation and restored when you return.
```

---

## Step 9: LLM Model Selector

**Title**: Choose Your AI Model
**Action Type**: Highlight
**Target**: LLM model selector button in the chat input toolbar (shows "Default" or a model name)

**Message**:
```
Override the AI model used for this conversation with the model selector button.

Options include:
- Assistant Default — uses the model the assistant was configured with
- Recommended — the platform's recommended model
- Any available model, searchable by name

The selected model applies to all subsequent messages in the current chat until you change it.
```

---

## Step 10: Skills Button (Conditional)

**Title**: Attach Skills to This Chat
**Action Type**: Highlight
**Target**: Skills button (lightning bolt icon labelled "Skills") in the chat input toolbar
**Condition**: Only show if Skills feature is enabled

**Message**:
```
Click the Skills button to add extra capabilities to this conversation without changing the assistant's configuration.

A badge on the button shows how many skills are currently active.

Use skills to extend what an assistant can do on a per-chat basis — great for one-off tasks that don't need a permanent assistant change.
```

---

## Step 11: Chat Header Actions

**Title**: Chat Controls at a Glance
**Action Type**: Highlight
**Target**: Chat header toolbar in the top-right area of the chat window (contains Share, Export, and Configuration buttons)

**Message**:
```
The chat header gives you quick access to key actions:

- Share Chat: generate a read-only link to share the conversation with teammates
- Export: download the full conversation as JSON, Word, PDF, or PowerPoint
- Configuration: open the assistant's settings panel for the current chat
- New Chat with Same Assistant: start a fresh chat with the same assistant
- Usage details: view token usage and cost for this conversation
```

---

## Step 12: Share a Chat

**Title**: Share Your Conversation
**Action Type**: Highlight
**Target**: Share Chat button in the chat header

**Message**:
```
Click Share Chat to generate a shareable link for this conversation.

Recipients with the link can:
- View the entire conversation history
- Read all messages and see attached files

Recipients cannot add messages or modify the conversation — it's read-only.

The link stays active until you delete the chat. You can edit or delete the chat at any time from the ⋮ context menu even after sharing.
```

---

## Step 13: Export a Conversation

**Title**: Export the Full Conversation
**Action Type**: Highlight
**Target**: Export (download) button in the top-right of the chat header

**Message**:
```
Export the entire conversation from the header export button.

Available formats: JSON, Word (DOCX), PDF, PowerPoint (PPTX)

The export includes all user messages, all AI responses, timestamps, and conversation metadata. All markdown formatting, code blocks, tables, and images are preserved.

Tip: To export only a single AI response, use the export (↗) icon directly below that message instead.
```

---

## Step 14: Organize Chats with Folders

**Title**: Keep Chats Organized
**Action Type**: Highlight
**Target**: "Folders" accordion section in the chat sidebar (below the "Chats" accordion)

**Message**:
```
Use folders to organize your chat history by topic, project, or assistant.

In the sidebar:
- Chats section: shows all conversations in chronological order
- Folders section: groups conversations into named folders

To create a folder, click the folder+ icon next to the "Folders" heading.
To move a chat into a folder, use the ⋮ menu on any chat item and select Move.

Deleting a folder removes all chats inside it at once — great for bulk cleanup.
```

---

## Step 15: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations! You've completed the Chat Interface tour.

You now know how to:
✓ Start a new chat and address assistants with @
✓ Copy, edit, resend, and delete your messages
✓ Copy, export, and rate AI responses
✓ Attach files and configure tools per conversation
✓ Share conversations via link and export to various formats
✓ Organize chats with folders
```

**Next Steps Suggestions**:

The modal should display a "Continue Learning" or "What's Next?" section with the following suggested flows:

```
Continue your learning journey with these guided tours:

1. 🤖 Creating Your First Assistant
   Build a custom assistant tailored to your specific needs and configure its capabilities
   Duration: 4-5 minutes

2. 🔌 Connect Your First Integration
   Link external tools like Jira, GitHub, or Slack to unlock richer assistant interactions
   Duration: 3-4 minutes

3. ⚡ Automate Tasks with Workflows
   Chain multiple assistants together to automate complex, multi-step processes
   Duration: 4-5 minutes

4. 📚 Add Knowledge with Data Sources
   Connect documents and repositories so assistants can answer questions about your data
   Duration: 4-5 minutes

You can skip these tours and start exploring on your own, or restart any tour from Help > Onboarding Tours.
```

**Implementation Note**: These suggestions should be clickable and start the respective onboarding flow when selected. Allow users to:
- Click a suggestion to start that flow immediately
- Dismiss the modal to explore on their own
- Access "Skip for now" option

---

**Last Updated**: 2026-04-15
**Version**: 1.2
