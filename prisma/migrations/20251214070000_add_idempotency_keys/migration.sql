-- Add idempotency keys for conversations/messages
--
-- This migration is safe for empty dev DB; it also attempts to rename Role enum values
-- from legacy uppercase to lowercase in a guarded way.

-- 1) Role enum: rename legacy values if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'USER'
  ) THEN
    EXECUTE 'ALTER TYPE "Role" RENAME VALUE ''USER'' TO ''user''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ASSISTANT'
  ) THEN
    EXECUTE 'ALTER TYPE "Role" RENAME VALUE ''ASSISTANT'' TO ''assistant''';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'SYSTEM'
  ) THEN
    EXECUTE 'ALTER TYPE "Role" RENAME VALUE ''SYSTEM'' TO ''system''';
  END IF;
END $$;

-- 2) Conversation: firstClientMessageId
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "firstClientMessageId" TEXT;

-- 3) Message: clientMessageId
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "clientMessageId" TEXT;

-- 4) Unique constraints (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "Conversation_userId_firstClientMessageId_key"
  ON "Conversation"("userId", "firstClientMessageId");

CREATE UNIQUE INDEX IF NOT EXISTS "Message_conversationId_clientMessageId_key"
  ON "Message"("conversationId", "clientMessageId");

