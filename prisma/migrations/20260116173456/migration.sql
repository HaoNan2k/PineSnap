-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'tool';

-- CreateTable
CREATE TABLE "Learning" (
    "id" TEXT NOT NULL,
    "plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Learning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningResource" (
    "learningId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningResource_pkey" PRIMARY KEY ("learningId","resourceId")
);

-- CreateTable
CREATE TABLE "LearningConversation" (
    "learningId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningConversation_pkey" PRIMARY KEY ("learningId","conversationId")
);

-- CreateIndex
CREATE INDEX "LearningConversation_conversationId_idx" ON "LearningConversation"("conversationId");

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_learningId_fkey" FOREIGN KEY ("learningId") REFERENCES "Learning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningResource" ADD CONSTRAINT "LearningResource_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningConversation" ADD CONSTRAINT "LearningConversation_learningId_fkey" FOREIGN KEY ("learningId") REFERENCES "Learning"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningConversation" ADD CONSTRAINT "LearningConversation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
