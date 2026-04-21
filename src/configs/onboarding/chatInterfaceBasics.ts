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

import { ONBOARDING_ASSISTANT_SLUG } from '@/constants/assistants'
import { HelpPageId } from '@/constants/helpLinks'
import { router } from '@/hooks/useVueRouter'
import { OnboardingFlow } from '@/types/onboarding'
import { isFeatureEnabled } from '@/utils/featureFlags'

const CHAT_ONBOARDING_PROMPT = 'What are the simplest usecases I can try with CodeMie?'

export const chatInterfaceBasicsFlow: OnboardingFlow = {
  id: 'chat-interface-basics',
  name: 'Chat Interface & First Conversation',
  description:
    'Learn how to use the chat interface, start conversations with assistants, and organize your chat history',
  emoji: '📱',
  duration: '4-5 min',
  triggers: {
    helpPanelPages: [{ id: HelpPageId.CHAT, firstTimePopup: true }],
    showOnWelcome: true,
  },
  steps: [
    // Step 1: Welcome
    {
      id: 'welcome',
      actionType: 'Modal',
      title: 'Welcome to Chat Interface',
      description: `Welcome to the Chat Interface tour!

In this guide, you'll learn how to:
- Start conversations with assistants
- Use group chats with multiple assistants
- Attach files and configure tools per conversation
- Share and export your chats
- Organize conversations with folders

Let's get started!`,
    },

    // Tech Step: Navigate to AssistantChatStartPage — creates a chat with the onboarding
    // assistant and auto-sends a prompt, so the history has a user message + AI response
    // ready before the tour continues.
    {
      id: 'start-onboarding-chat',
      actionType: 'CodeExecution',
      execute: () => {
        router.push({
          name: 'start-assistant-chat',
          params: { slug: ONBOARDING_ASSISTANT_SLUG },
          query: { prompt: CHAT_ONBOARDING_PROMPT },
        })
      },
      delay: 300,
    },

    // Step 2: New Chat Button
    {
      id: 'new-chat-button',
      actionType: 'Highlight',
      title: 'Start a New Conversation',
      target: '[data-onboarding="chat-new-chat-button"]',
      description: `Click "New Chat" to start a fresh conversation at any time.

You can also use this button in the top header when the sidebar is collapsed.

Tip: To continue with the same assistant from your current chat, use the "New Chat with Same Assistant" button in the chat header.`,
    },

    // Step 3: Recent Assistants & Workflows
    {
      id: 'sidebar-recents',
      actionType: 'Highlight',
      title: 'Quick Access to Assistants & Workflows',
      target: '[data-onboarding="chat-sidebar-recents"]',
      description: `Your most recently used assistants and workflows appear here for quick access.

Click any item to instantly start a new chat with it.

The ⋮ menu next to each assistant lets you:
- Start a new chat
- View assistant details
- Edit the assistant
- Remove it from your recents list

The ⋮ menu for workflows offers:
- Start a new chat
- View workflow details

Use the "Explore Assistants" and "Explore Workflows" links below each section to browse the full catalog.`,
    },

    // Step 4: User Message
    {
      id: 'user-message',
      actionType: 'Highlight',
      title: 'Your Messages in the Chat',
      target: '[data-onboarding="chat-user-message"]',
      description: `This is your message in the conversation history. Hover over it to reveal quick actions:

- Copy: copies the message text to your clipboard
- Edit: modify the message and regenerate the AI response from that point
- Resend: re-send the same message to get a fresh response
- Delete: remove the message and all subsequent messages in the thread

Tip: Editing a message discards all responses that came after it, letting you explore a different direction in the conversation.`,
    },

    // Step 5: AI Response Actions
    {
      id: 'ai-message',
      actionType: 'Highlight',
      title: 'Working with AI Responses',
      target: '[data-onboarding="chat-ai-message"]',
      description: `Every AI response comes with a set of actions shown below it:

- Copy: copies the full response to your clipboard (with rich text formatting)
- Edit: refine the response inline and save your changes
- Export (↗ icon): download this single response as Word (DOCX), PDF, or PowerPoint (PPTX)
- 👍 / 👎: rate the response to help improve the assistant

If the assistant generated multiple response variants, use the left/right arrows to navigate between them.`,
    },

    // Step 6: Chat Input Field
    {
      id: 'chat-input',
      actionType: 'Highlight',
      title: 'Type Your Messages Here',
      target: '[data-onboarding="chat-input"]',
      description: `Type your message in this input field. Press Enter to send, or Shift+Enter for a new line.

This is a group chat — you can talk to multiple assistants in a single conversation.

To address an assistant, type @ and select one from the list. The first message in a new chat must always use @ to specify an assistant. All follow-up messages go to the most recently mentioned assistant.

Tip: Only one assistant can be mentioned per message.`,
    },

    // Step 7: File Attachments
    {
      id: 'file-upload',
      actionType: 'Highlight',
      title: 'Attach Files to Your Message',
      target: '[data-onboarding="chat-file-upload"]',
      description: `Click the paperclip icon to attach files to your message.

Supported formats:
- Images: JPEG, JPG, PNG, GIF
- Documents: PDF, PPTX
- Data: CSV (up to 100 MB per file)

Once uploaded, files stay accessible throughout the conversation — no need to re-upload them for follow-up questions.

Tip: You can also paste files directly into the input field.`,
    },

    // Step 8: Tools Settings (Conditional — only if Web Search or Code Interpreter is on)
    {
      id: 'tools-settings',
      actionType: 'Highlight',
      title: 'Configure Tools for This Chat',
      target: '[data-onboarding="chat-tools-settings"]',
      condition: () =>
        isFeatureEnabled('features:webSearch') ||
        isFeatureEnabled('features:dynamicCodeInterpreter'),
      description: `Click the sliders icon to open Tools Settings for this conversation.

Available tools (when enabled by your admin):
- Web Search: lets the assistant search the web for up-to-date information
- Code Interpreter: lets the assistant write and run Python code for data analysis and calculations

The badge on the icon shows how many tools are currently active.

Your tool settings are saved per conversation and restored when you return.`,
    },

    // Step 9: LLM Model Selector
    {
      id: 'llm-selector',
      actionType: 'Highlight',
      title: 'Choose Your AI Model',
      target: '[data-onboarding="chat-llm-selector"]',
      description: `Override the AI model used for this conversation with the model selector button.

Options include:
- Assistant Default — uses the model the assistant was configured with
- Recommended — the platform's recommended model
- Any available model, searchable by name

The selected model applies to all subsequent messages in the current chat until you change it.`,
    },

    // Step 10: Skills Button (Conditional — only if skills feature is enabled)
    {
      id: 'skills-button',
      actionType: 'Highlight',
      title: 'Attach Skills to This Chat',
      target: '[data-onboarding="chat-skills-button"]',
      condition: () => isFeatureEnabled('skills'),
      description: `Click the Skills button to add extra capabilities to this conversation without changing the assistant's configuration.

A badge on the button shows how many skills are currently active.

Use skills to extend what an assistant can do on a per-chat basis — great for one-off tasks that don't need a permanent assistant change.`,
    },

    // Step 11: Chat Header Actions overview
    {
      id: 'header-actions',
      actionType: 'Highlight',
      title: 'Chat Controls at a Glance',
      target: '[data-onboarding="chat-header-actions"]',
      description: `The chat header gives you quick access to key actions:

- Share Chat: generate a read-only link to share the conversation with teammates
- Export: download the full conversation as JSON, Word, PDF, or PowerPoint
- Configuration: open the assistant's settings panel for the current chat
- New Chat with Same Assistant: start a fresh chat with the same assistant
- Usage details: view token usage and cost for this conversation`,
    },

    // Step 12: Share a Chat
    {
      id: 'share-chat',
      actionType: 'Highlight',
      title: 'Share Your Conversation',
      target: '[data-onboarding="chat-share-button"]',
      description: `Click Share Chat to generate a shareable link for this conversation.

Recipients with the link can:
- View the entire conversation history
- Read all messages and see attached files

Recipients cannot add messages or modify the conversation — it's read-only.

The link stays active until you delete the chat. You can edit or delete the chat at any time from the ⋮ context menu even after sharing.`,
    },

    // Step 13: Export a Conversation
    {
      id: 'export-chat',
      actionType: 'Highlight',
      title: 'Export the Full Conversation',
      target: '[data-onboarding="chat-export-button"]',
      description: `Export the entire conversation from the header export button.

Available formats: JSON, Word (DOCX), PDF, PowerPoint (PPTX)

The export includes all user messages, all AI responses, timestamps, and conversation metadata. All markdown formatting, code blocks, tables, and images are preserved.

Tip: To export only a single AI response, use the export (↗) icon directly below that message instead.`,
    },

    // Step 14: Organize Chats with Folders
    {
      id: 'folders',
      actionType: 'Highlight',
      title: 'Keep Chats Organized',
      target: '[data-onboarding="chat-sidebar-folders"]',
      description: `Use folders to organize your chat history by topic, project, or assistant.

In the sidebar:
- Chats section: shows all conversations in chronological order
- Folders section: groups conversations into named folders

To create a folder, click the folder+ icon next to the "Folders" heading.
To move a chat into a folder, use the ⋮ menu on any chat item and select Move.

Deleting a folder removes all chats inside it at once — great for bulk cleanup.`,
    },

    // Step 15: Completion
    {
      id: 'complete',
      actionType: 'Modal',
      title: "You're All Set!",
      description: `Congratulations! You've completed the Chat Interface tour.

You now know how to:
✓ Start a new chat and address assistants with @
✓ Copy, edit, resend, and delete your messages
✓ Copy, export, and rate AI responses
✓ Attach files and configure tools per conversation
✓ Share conversations via link and export to various formats
✓ Organize chats with folders`,
      suggestedNextFlows: [
        {
          flowId: 'assistants-overview',
          emoji: '🤖',
          title: 'Creating Your First Assistant',
          description:
            'Build a custom assistant tailored to your specific needs and configure its capabilities',
          duration: '4-5 minutes',
        },
        {
          flowId: 'first-integration',
          emoji: '🔌',
          title: 'Connect Your First Integration',
          description:
            'Link external tools like Jira, GitHub, or Slack to unlock richer assistant interactions',
          duration: '3-4 minutes',
        },
        {
          flowId: 'first-data-source',
          emoji: '📚',
          title: 'Add Knowledge with Data Sources',
          description:
            'Connect documents and repositories so assistants can answer questions about your data',
          duration: '4-5 minutes',
        },
      ],
    },
  ],
}
