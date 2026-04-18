-- CreateEnum
CREATE TYPE "ConversationKind" AS ENUM ('canvas', 'chat');

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "kind" "ConversationKind" NOT NULL DEFAULT 'canvas';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "anchoredCanvasMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Message_anchoredCanvasMessageId_idx" ON "Message"("anchoredCanvasMessageId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_anchoredCanvasMessageId_fkey" FOREIGN KEY ("anchoredCanvasMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
