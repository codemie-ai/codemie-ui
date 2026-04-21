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

import React from 'react'

import FirstTimeWelcomeContent from '@/components/Onboarding/FirstTimeWelcomeContent'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { OnboardingFlow } from '@/types/onboarding'
import { isEnterpriseEdition } from '@/utils/enterpriseEdition'
import { findNavLinkByText } from '@/utils/onboarding'

export const navigationIntroductionFlow: OnboardingFlow = {
  id: 'navigation-introduction',
  name: 'Navigation & Core Features Tour',
  description: 'Complete walkthrough of the CodeMie navigation bar and all available features',
  emoji: '🧭',
  duration: '5-6 min',
  triggers: { showOnWelcome: true, releaseVersions: ['2.16.0'] },
  onComplete: () => appInfoStore.completeOnboarding(),
  steps: [
    // Step 1: Welcome
    {
      id: 'welcome',
      actionType: 'Modal',
      title: 'Welcome to CodeMie!',
      description: '',
      customRender: () => React.createElement(FirstTimeWelcomeContent),
    },

    // Tech Step: Expand Navigation
    {
      id: 'expand-navigation',
      actionType: 'CodeExecution',
      execute: () => {
        // Expand navigation if it's currently collapsed
        if (!appInfoStore.navigationExpanded) {
          appInfoStore.toggleNavigationExpanded()
        }
      },
      onBack: () => {
        // Re-collapse navigation to restore pre-flow state
        if (appInfoStore.navigationExpanded) {
          appInfoStore.toggleNavigationExpanded()
        }
      },
    },

    // Step 2: Navigation Overview
    {
      id: 'navigation-overview',
      actionType: 'Highlight',
      title: 'Your Navigation Hub',
      target: '[data-onboarding="navigation-menu"]',
      description: `This is your main navigation menu. All of CodeMie's features are organized here.

The navigation is divided into three sections:
1. Core features (top) - Your most-used tools
2. Advanced features (middle) - Configuration needed for assistants and workflows
3. User tools (bottom) - Help and profile settings

Click the expand button at the bottom to show/hide labels.`,
    },

    // Step 3: Create New Chat
    {
      id: 'create-new-chat',
      actionType: 'Highlight',
      title: 'Quick Chat Creation',
      target: '[data-onboarding="navigation-logo"]',
      description: `The CodeMie logo at the top is more than just branding - it's a quick action button!

Click it anytime to instantly create a new chat and start fresh.
This is the fastest way to begin a conversation without navigating through menus.`,
    },

    // Step 4: Chats
    {
      id: 'chats',
      actionType: 'Highlight',
      title: 'Chats - Your Conversation Hub',
      target: () => findNavLinkByText('Chats'),
      description: `The Chats section is where all your conversations happen.

Features:
- Start new conversations with AI assistants and workflows
- Continue previous chats from your history
- Search through past conversations
- Organize chats by topic or project

Think of this as your primary workspace for interacting with AI.`,
    },

    // Step 5: Assistants
    {
      id: 'assistants',
      actionType: 'Highlight',
      title: 'Assistants - Specialized AI Helpers',
      target: () => findNavLinkByText('Assistants'),
      description: `Assistants are specialized AI agents designed for specific purposes.

What you can do here:
- Browse pre-built assistants from the marketplace
- Create custom assistants with specific knowledge and behavior
- Configure assistant capabilities and permissions
- Share assistants with your team

Each assistant can be tailored with:
- Custom instructions and personality
- Specific knowledge bases and data sources
- Unique skills and integrations
- Access controls and usage limits`,
    },

    // Step 6: Skills (Conditional)
    {
      id: 'skills',
      actionType: 'Highlight',
      title: 'Skills - Extend AI Capabilities (NEW!)',
      target: () => findNavLinkByText('Skills'),
      description: `Skills are specialized capabilities that enhance your assistants' abilities.

What are skills?
- Reusable tools and functions that assistants can use
- Examples: web search, code execution, API integrations
- Can be enabled/disabled per assistant
- Custom skills can be created for your needs

This is a new feature marked with the "NEW" badge!`,
      condition: () => {
        // Check if Skills nav item exists
        return !!findNavLinkByText('Skills')
      },
    },

    // Step 7: Workflows
    {
      id: 'workflows',
      actionType: 'Highlight',
      title: 'Workflows - Automate Your Tasks',
      target: () => findNavLinkByText('Workflows'),
      description: `Workflows let you automate complex, multi-step processes.

Key capabilities:
- Visual workflow editor with drag-and-drop nodes
- Chain multiple assistants and actions together
- Add conditional logic and branching
- Schedule workflows to run automatically
- Monitor execution history and results

Perfect for:
- Repetitive tasks that follow a pattern
- Complex processes requiring multiple AI assistants
- Scheduled reports and data processing
- Integration pipelines`,
    },

    // Step 8: Applications (Conditional)
    {
      id: 'applications',
      actionType: 'Highlight',
      title: 'Applications - Custom App Integration',
      target: () => findNavLinkByText('Applications'),
      description: `The Applications section manages custom micro-frontend applications.

What you can do:
- View integrated third-party applications
- Use the configured applications and their features directly within CodeMie`,
      condition: () => {
        return !!findNavLinkByText('Applications')
      },
    },

    // Step 9: Integrations
    {
      id: 'integrations',
      actionType: 'Highlight',
      title: 'Integrations - Connect External Tools',
      target: () => findNavLinkByText('Integrations'),
      description: `Integrations allow CodeMie to connect with external tools and services.

Available integrations:
- Authentication providers (Google, Azure AD, etc.)
- Development tools (Jira, GitHub, GitLab)
- Cloud storage (S3, Google Drive)
- Custom API integrations

Benefits:
- Access data from external systems by connecting them to your assistants or workflows
- Trigger actions in other tools through workflows
- Centralized configuration management
- Secure credential storage`,
    },

    // Step 10: Data Sources
    {
      id: 'data-sources',
      actionType: 'Highlight',
      title: 'Data Sources - Knowledge Management',
      target: () => findNavLinkByText('Data Sources'),
      description: `Data Sources provide assistants and workflows with access to your organization's knowledge.

Supported data source types:
- Document repositories (Confluence, SharePoint)
- Code repositories (GitHub, GitLab)
- Databases and data warehouses
- File storage systems
- Custom data connectors

How it works:
- Connect a data source and index its content
- Attach data sources to specific assistants
- Assistants can search and reference this knowledge in conversations
- Keep your sensitive data secure with access controls`,
    },

    // Step 11: AI Katas
    {
      id: 'ai-katas',
      actionType: 'Highlight',
      title: 'AI Katas - Learning Challenges (NEW!)',
      target: () => findNavLinkByText('AI Katas'),
      description: `AI Katas are interactive learning challenges to help you master AI-assisted development.

What are Katas?
- Structured learning exercises inspired by coding katas
- Practice prompt engineering and AI interaction
- Learn best practices for working with AI assistants
- Track your progress and achievements

Perfect for:
- New users learning how to work with AI
- Teams establishing AI usage best practices
- Continuous learning and skill improvement

This is a brand new feature - try it out!`,
      condition: () => {
        return !!findNavLinkByText('AI Katas')
      },
    },

    // Step 12: Analytics
    {
      id: 'analytics',
      actionType: 'Highlight',
      title: 'Analytics - Insights & Metrics (NEW!)',
      target: () => findNavLinkByText('Analytics'),
      description: `The Analytics section provides insights into how you're using CodeMie.

Available metrics:
- Chat usage statistics (messages sent, tokens used)
- Assistant performance metrics
- Workflow execution history and success rates
- Cost tracking and budget monitoring
- User activity and trends

Features:
- Customizable dashboards
- Export data for reporting
- Set up alerts for important metrics
- Historical trend analysis

Use this to optimize your AI usage and demonstrate ROI.`,
      condition: () => {
        return !!findNavLinkByText('Analytics')
      },
    },

    // Step 13: Pre-built Assistants (Conditional)
    {
      id: 'prebuilt-assistants',
      actionType: 'Highlight',
      title: 'Your Pre-built Assistants',
      target: '[data-onboarding="prebuilt-assistants"]',
      description: `You have access to pre-built assistants!

These assistants are ready to use:
- FAQ: Get help with CodeMie features and platform guidance
- Chatbot: General conversations and image generation with DALL-E

Click on any assistant to start using it right away!`,
      condition: () => {
        const assistantsSection = document.querySelector(
          'header nav[aria-label="bottom-nav-links"]'
        )
        return !!assistantsSection?.querySelector('div[class*="flex"]')
      },
    },

    // Step 14: Help Navigation Item
    {
      id: 'help-nav-item',
      actionType: 'Highlight',
      title: 'Help - Documentation & Support',
      target: () => findNavLinkByText('Help'),
      description: `Need assistance? The Help section is your central hub for support and learning.

Let's explore what's available in the Help Center!`,
    },

    // Tech Step: Navigate to Help
    {
      id: 'navigate-to-help',
      actionType: 'Navigation',
      route: { name: 'help' },
      delay: 500,
    },

    // Step 15: AI Help Section
    {
      id: 'ai-help-section',
      actionType: 'Highlight',
      title: 'AI Help - Instant Smart Support',
      target: '[data-onboarding="help-ai-section"]',
      description: `Get instant support from our AI assistants!

Available AI helpers:
- FAQ: Learn how to use CodeMie features
- Chatbot: General questions and image generation with DALL-E

These assistants are always ready to help you navigate the platform.`,
    },

    // Step 16: Learning Resources Section
    {
      id: 'learning-resources-section',
      actionType: 'Highlight',
      title: 'Learning Resources',
      target: '[data-onboarding="help-learning-section"]',
      description: `Explore comprehensive learning materials:

- Video Portal: Short tutorials, walkthroughs, and product tips
- User Guide: Step-by-step documentation for all key features
- YouTube Channel: Watch detailed product guides and tutorials
- CodeMie Learning Courses: Structured courses to build your AI skills step by step

Perfect for deepening your understanding of CodeMie capabilities.`,
    },

    // Step 17: Product Updates Section
    {
      id: 'product-updates-section',
      actionType: 'Highlight',
      title: 'Product Updates - Stay Current',
      target: '[data-onboarding="help-updates-section"]',
      description: `Track what's new, and what's improved!

- Release Notes: View the latest changes, fixes, and enhancements

Stay up-to-date with new features and improvements to make the most of CodeMie.`,
    },

    // Step 18: Onboarding Tours Section (Conditional - future)
    {
      id: 'onboarding-tours-section',
      actionType: 'Highlight',
      title: 'Onboarding Tours - Interactive Learning',
      target: '[data-onboarding="help-onboarding-section"]',
      delay: 300,
      description: `Access all interactive onboarding tours from one convenient place! You can restart any tour or explore new features anytime from here.`,
    },

    // Tech Step: Expand Profile Menu
    {
      id: 'expand-profile-menu',
      actionType: 'CodeExecution',
      execute: () => {
        const profileButton = document.querySelector('[data-onboarding="profile-button"]')
        if (profileButton instanceof HTMLElement) {
          profileButton.click()
        }
      },
      onBack: () => {
        // Close the profile dropdown by toggling it again
        const profileButton = document.querySelector('[data-onboarding="profile-button"]')
        if (profileButton instanceof HTMLElement) {
          profileButton.click()
        }
      },
    },

    // Step 19: Profile Section with Options
    {
      id: 'profile-section',
      actionType: 'Highlight',
      title: 'Your Profile & Settings',
      target: '[data-onboarding="profile-expand-content"]',
      description: `Your profile section provides quick access to:

- Settings: View and manage your account, customize themes and preferences
- Logout: Sign out of your account

Let's explore what's available in your Profile!`,
    },

    // Tech Step: Collapse Profile Menu
    {
      id: 'collapse-profile-menu',
      actionType: 'CodeExecution',
      execute: () => {
        const profileButton = document.querySelector('[data-onboarding="profile-button"]')
        if (profileButton instanceof HTMLElement) {
          profileButton.click()
        }
      },
      onBack: () => {
        const profileButton = document.querySelector('[data-onboarding="profile-button"]')
        if (profileButton instanceof HTMLElement) {
          profileButton.click()
        }
      },
    },

    // Tech Step: Navigate to Profile
    {
      id: 'navigate-to-profile',
      actionType: 'Navigation',
      route: { name: 'settings' },
      delay: 500,
    },

    // Step 20: Profile Card
    {
      id: 'profile-card',
      actionType: 'Highlight',
      title: 'Your Account Information',
      target: '[data-onboarding="profile-card"]',
      description: `Your profile card displays your account information:

- Name and email address
- Profile picture (if configured)

Update your profile settings to personalize your CodeMie experience.`,
    },

    // Step 21: Personal Spending Widget (Enterprise only)
    {
      id: 'spending-card',
      actionType: 'Highlight',
      title: 'Your Personal Spending',
      target: '[data-onboarding="spending-card"]',
      description: `Keep track of your AI usage costs at a glance!

This widget shows:
- Current spending vs. your assigned budget limit
- A visual progress indicator showing how much of your budget you've used
- A breakdown of spending across all your projects
- Budget reset date and time remaining until reset

The indicator changes color as you approach your limit — green (safe), yellow (warning), red (critical). Check this regularly to avoid unexpected budget overruns.`,
      condition: () => isEnterpriseEdition(),
    },

    // Step 22: Conversation Settings
    {
      id: 'conversation-settings',
      actionType: 'Highlight',
      title: 'Conversation Preferences',
      target: '[data-onboarding="conversation-card"]',
      description: `Actions to manage your conversations:
      - Delete All Conversations: Instantly delete all your chat history and start fresh
      `,
    },

    // Step 23: Theme Switching
    {
      id: 'theme-switching',
      actionType: 'Highlight',
      title: 'Appearance & Theme Customization',
      target: '[data-onboarding="theme-toggle"]',
      description: `Customize your CodeMie experience by switching themes!

Available themes:
🌙 Dark Mode - Reduces eye strain in low-light environments
☀️ Light Mode - Provides a bright, clear interface

Your theme preference is saved automatically and applies across all sessions.

Try clicking on a theme option to see the change!`,
    },

    // Step 24: Administration Tab (Admin only)
    {
      id: 'administration-tab',
      actionType: 'Highlight',
      title: 'Administration - Platform Management',
      target: '[data-onboarding="sidebar-nav-administration"]',
      description: `As an administrator, you have access to platform-wide management tools in the Administration section.

Available pages:
- AI/Run Adoption Framework: Define and track organization-wide AI adoption goals, configure scoring dimensions, and monitor team progress (Enterprise)
- Categories management: Create and manage categories used to organize assistants and other content across the platform
- MCPs management: Browse and configure the MCP (Model Context Protocol) server catalog that assistants can connect to
- Projects management: Create projects, assign budget limits to users, and control who has access to what
- Providers management: Register and configure AI model providers (e.g. OpenAI, Azure OpenAI) and manage their API credentials

Use these tools to customize and govern CodeMie for your entire organization.`,
      condition: () => !!userStore.user?.isAdmin,
    },

    // Step 26: Navigation Expansion Control
    {
      id: 'navigation-expansion',
      actionType: 'Highlight',
      title: 'Expand/Collapse Navigation',
      target: () => {
        // Find the expand/collapse button at the bottom of navigation
        // It's typically the last button in the header
        const navButtons = Array.from(document.querySelectorAll('header button'))
        return navButtons[navButtons.length - 1] as HTMLElement
      },
      description: `The expand/collapse button lets you control the navigation width.

Two modes:
- Compact mode: Shows only icons (saves screen space)
- Expanded mode: Shows icons + labels (easier to navigate)

Your preference is saved automatically and persists across sessions.

Tip: Use the compact mode for more workspace on smaller screens!`,
    },

    // Tech Step: Toggle Navigation Demo
    {
      id: 'toggle-navigation-demo',
      actionType: 'CodeExecution',
      execute: () => {
        // Toggle navigation to demonstrate the feature
        appInfoStore.toggleNavigationExpanded()
      },
      onBack: () => {
        // Reverse the demo toggle
        appInfoStore.toggleNavigationExpanded()
      },
    },

    // Step 24: Completion
    {
      id: 'complete',
      actionType: 'Modal',
      title: "You're All Set!",
      description: `Congratulations! You've completed the navigation tour.

You now know how to:
✓ Navigate between different sections
✓ Access core features (Chats, Assistants, Workflows)
✓ Find advanced tools (Integrations, Data Sources, Analytics)
✓ Get help when you need it
✓ Customize your navigation view

You can skip or restart any tour at any time from Help > Onboarding Tours.`,
      suggestedNextFlows: [
        {
          flowId: 'chat-interface-basics',
          emoji: '📱',
          title: 'Chat Interface & First Conversation',
          description:
            'Learn how to use the chat interface and have your first conversation with a pre-built assistant',
          duration: '2-3 minutes',
        },
        {
          flowId: 'assistants-overview',
          emoji: '🤖',
          title: 'Assistants Overview & Creation',
          description:
            'Explore the assistants catalog, understand capabilities, and create your first custom assistant',
          duration: '4-5 minutes',
        },
        {
          flowId: 'first-integration',
          emoji: '🔌',
          title: 'Connect Your First Integration',
          description: 'Learn how to connect external tools and services to CodeMie',
          duration: '3-4 minutes',
        },
        {
          flowId: 'first-data-source',
          emoji: '📚',
          title: 'Add Your First Data Source',
          description:
            "Connect a data source to give assistants access to your organization's knowledge",
          duration: '4-5 minutes',
        },
      ],
    },
  ],
}
