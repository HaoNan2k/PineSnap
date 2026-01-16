# server/routers

## OVERVIEW
tRPC API routers defining the authenticated communication boundary between client and database.

## WHERE TO LOOK
- **conversation.ts**: CRUD procedures for conversations, including rename and soft delete.
- **files.ts**: Procedures for signed URL generation and file metadata management.
- **resource.ts**: Procedures for managing learning resources and capture tokens.
- **index.ts**: Root router aggregating all sub-routers.

## CONVENTIONS
- **Auth Guard**: Use \`protectedProcedure\` for all user-specific data access.
- **Input Validation**: Every procedure MUST have a Zod schema for input validation.
- **Soft Delete**: Procedures must respect the \`deletedAt\` filters (handled via Prisma client guards).

## ANTI-PATTERNS
- **NO Complex Business Logic**: Keep routers thin; delegate complex logic to \`lib/chat\` or \`lib/db\`.
- **NO Physical Deletion**: Always use the soft-delete pattern via \`deletedAt\`.
