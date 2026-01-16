# components/chat

## OVERVIEW
Primary chat interface components integrating Vercel AI SDK beta for streaming and multi-part message rendering.

## WHERE TO LOOK
- **ChatArea**: Main orchestration component using \`useChat\`. Handles transport, URL synchronization for lazy conversations, and data stream events.
- **MessageList**: Renders the conversation thread, mapping structured \`ChatPart\` arrays to UI components.
- **MultimodalInput**: Handles text input and file attachments, injecting provider metadata for AI processing.
- **SuggestionCards**: Pre-configured prompts for starting new conversations.

## CONVENTIONS
- **UIMessage Format**: Components expect messages in the \`UIMessage\` format with \`parts\` metadata.
- **Streaming Data**: Use \`DataStreamHandler\` context for out-of-band metadata (titles, IDs).
- **Custom Transport**: All AI requests go through a custom transport layer defined in \`ChatArea\`.

## ANTI-PATTERNS
- **NO Inline Message Logic**: Keep mapping logic in \`converter.ts\` or specialized sub-components.
- **NO Manual Context Splicing**: Rely on server-side history concatenation; don't send full history from client.
