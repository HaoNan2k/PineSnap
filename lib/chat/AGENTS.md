# lib/chat

## OVERVIEW
Critical domain logic for message format conversion and chat-specific utilities.

## WHERE TO LOOK
- **converter.ts**: The central hub for three-way conversion (DB jsonb ↔ Model messages ↔ UI messages). Handles file resolution and truncation.
- **types.ts**: Canonical definitions for \`ChatPart\`, \`UIMessage\`, and transport schemas.
- **utils.ts**: Shared helpers for message processing and state management.

## CONVENTIONS
- **File Resolution**: Images are converted to model-ready bytes; text files are truncated at 20K characters.
- **Tool Mapping**: Tool calls and results must be explicitly handled in both directions.
- **Signed URL Refresh**: Converter handles resolving storage IDs to temporary signed URLs.

## ANTI-PATTERNS
- **NO Side Effects in Converter**: Keep conversion logic pure; any DB or storage calls should be passed as dependencies.
- **NO Direct Prisma Access**: Use \`lib/db\` for persistence; this directory is for logic only.
