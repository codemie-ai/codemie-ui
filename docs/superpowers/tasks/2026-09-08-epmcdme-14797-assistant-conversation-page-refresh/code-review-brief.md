# Code Review Brief: EPMCDME-14797 (Frontend)

Prevent assistant chat loss on page reload, implement reactive polling for active turn states, and support post-refresh Stop generation.

### Key Changes
- Extended `HistoryItemBackend` interface with `in_progress` and `status`.
- Mapped and reconstructed in-progress turn groups and active thoughts in `transformHistoryGroup`.
- Implemented reactive dual-store polling in `chatsStore` proxy with a 150-attempt timeout ceiling and cleanup.
- Updated `stopChatGeneration` to support post-refresh stop, halt polling, and call backend `/abort` endpoint.
