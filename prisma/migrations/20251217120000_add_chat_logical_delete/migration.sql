-- Add soft-delete fields and remove cascade physical deletes.

-- 1) Add deletedAt columns
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- 2) Replace FK to avoid ON DELETE CASCADE (physical cascade delete)
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_conversationId_fkey";
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

-- 3) Helpful indexes for default "not deleted" queries
CREATE INDEX IF NOT EXISTS "Conversation_userId_deletedAt_idx"
  ON "Conversation"("userId", "deletedAt");

CREATE INDEX IF NOT EXISTS "Message_conversationId_deletedAt_idx"
  ON "Message"("conversationId", "deletedAt");

