/**
 * Manual verification script for lib/db/discussion.ts AnchorValidationError logic.
 *
 * Usage:
 *   pnpm tsx scripts/verify-discussion-validator.ts
 *
 * Requires local Supabase (.env.local DIRECT_URL) running. Creates throwaway
 * test data (learning, conversations, messages) and exercises every validation
 * branch, then cleans up via soft-delete.
 *
 * This is a stop-gap until a proper test framework (vitest) is bootstrapped
 * for the project. See openspec/changes/redesign-canvas-chat-architecture
 * task 1.10 for context.
 */
import { ConversationKind, Role } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  AnchorValidationError,
  assertValidAnchor,
  createDiscussionMessage,
  getDiscussionMessages,
} from "../lib/db/discussion";
import { getOrCreateChatConversation } from "../lib/db/conversation";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

async function expectError(
  reason: AnchorValidationError["reason"],
  fn: () => Promise<unknown>
) {
  try {
    await fn();
    throw new Error(`expected AnchorValidationError(${reason}), got success`);
  } catch (err) {
    if (err instanceof AnchorValidationError && err.reason === reason) {
      console.log(`  ✓ rejected with reason=${reason}`);
      return;
    }
    throw err;
  }
}

async function main() {
  // Sanity-check we're hitting local Supabase, not production.
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (!dbUrl.includes("127.0.0.1") && !dbUrl.includes("localhost")) {
    throw new Error(
      `Refusing to run against non-local DB. DATABASE_URL must point to 127.0.0.1 or localhost; got: ${dbUrl.slice(0, 60)}...`
    );
  }

  console.log("Setting up test fixtures...");

  // Create two learnings (for cross-learning anchor test).
  const learningA = await prisma.learning.create({
    data: { plan: "test plan A" },
  });
  const learningB = await prisma.learning.create({
    data: { plan: "test plan B" },
  });

  // Create canvas conversation for learning A.
  const canvasConvA = await prisma.conversation.create({
    data: {
      userId: TEST_USER_ID,
      kind: ConversationKind.canvas,
      title: "test canvas A",
    },
  });
  await prisma.learningConversation.create({
    data: { learningId: learningA.id, conversationId: canvasConvA.id },
  });

  // Create canvas conversation for learning B.
  const canvasConvB = await prisma.conversation.create({
    data: {
      userId: TEST_USER_ID,
      kind: ConversationKind.canvas,
      title: "test canvas B",
    },
  });
  await prisma.learningConversation.create({
    data: { learningId: learningB.id, conversationId: canvasConvB.id },
  });

  // Add messages to canvas A: assistant + user + soft-deleted assistant.
  const assistantMsg = await prisma.message.create({
    data: {
      conversationId: canvasConvA.id,
      role: Role.assistant,
      parts: [{ type: "text", text: "test assistant message" }],
    },
  });
  const userMsg = await prisma.message.create({
    data: {
      conversationId: canvasConvA.id,
      role: Role.user,
      parts: [{ type: "text", text: "test user message" }],
    },
  });
  const deletedAssistantMsg = await prisma.message.create({
    data: {
      conversationId: canvasConvA.id,
      role: Role.assistant,
      parts: [{ type: "text", text: "soft-deleted assistant" }],
      deletedAt: new Date(),
    },
  });

  // Get-or-create chat conversation for learning A.
  console.log("\nTest: getOrCreateChatConversation lazy creation...");
  const chatConvA1 = await getOrCreateChatConversation(
    learningA.id,
    TEST_USER_ID
  );
  const chatConvA2 = await getOrCreateChatConversation(
    learningA.id,
    TEST_USER_ID
  );
  if (chatConvA1.id !== chatConvA2.id) {
    throw new Error("Race protection failed: got two different chat conversations");
  }
  console.log(`  ✓ idempotent: chat conv id ${chatConvA1.id}`);
  if (chatConvA1.kind !== ConversationKind.chat) {
    throw new Error(`expected kind=chat, got ${chatConvA1.kind}`);
  }
  console.log(`  ✓ kind=chat`);

  console.log("\nTest: assertValidAnchor positive case...");
  await assertValidAnchor(chatConvA1.id, assistantMsg.id);
  console.log("  ✓ valid anchor accepted");

  console.log("\nTest: anchor_not_found...");
  await expectError("anchor_not_found", () =>
    assertValidAnchor(chatConvA1.id, "00000000-0000-0000-0000-deadbeef0000")
  );

  console.log("\nTest: anchor_soft_deleted...");
  await expectError("anchor_soft_deleted", () =>
    assertValidAnchor(chatConvA1.id, deletedAssistantMsg.id)
  );

  console.log("\nTest: anchor_wrong_role (user message)...");
  await expectError("anchor_wrong_role", () =>
    assertValidAnchor(chatConvA1.id, userMsg.id)
  );

  console.log("\nTest: anchor_cross_learning (anchor in learning B's canvas)...");
  const assistantInB = await prisma.message.create({
    data: {
      conversationId: canvasConvB.id,
      role: Role.assistant,
      parts: [{ type: "text", text: "B assistant" }],
    },
  });
  await expectError("anchor_cross_learning", () =>
    assertValidAnchor(chatConvA1.id, assistantInB.id)
  );

  console.log("\nTest: anchor_wrong_kind (anchor pointing to a chat message)...");
  // Create a chat message to use as bad anchor.
  const chatMsg = await prisma.message.create({
    data: {
      conversationId: chatConvA1.id,
      role: Role.user,
      parts: [{ type: "text", text: "test chat message" }],
    },
  });
  await expectError("anchor_wrong_kind", () =>
    assertValidAnchor(chatConvA1.id, chatMsg.id)
  );

  console.log("\nTest: chat_conversation_wrong_kind (chatConversationId points to canvas)...");
  await expectError("chat_conversation_wrong_kind", () =>
    assertValidAnchor(canvasConvA.id, assistantMsg.id)
  );

  console.log("\nTest: createDiscussionMessage happy path + getDiscussionMessages...");
  const created1 = await createDiscussionMessage({
    chatConversationId: chatConvA1.id,
    anchorMessageId: assistantMsg.id,
    role: Role.user,
    parts: [{ type: "text", text: "first question" }],
    clientMessageId: "test-1",
  });
  const created2 = await createDiscussionMessage({
    chatConversationId: chatConvA1.id,
    anchorMessageId: assistantMsg.id,
    role: Role.assistant,
    parts: [{ type: "text", text: "first answer" }],
  });
  const fetched = await getDiscussionMessages(chatConvA1.id);
  const ids = fetched.map((m) => m.id);
  if (!ids.includes(created1.id) || !ids.includes(created2.id)) {
    throw new Error("getDiscussionMessages did not return created messages");
  }
  console.log(`  ✓ created + fetched ${fetched.length} messages`);

  // Verify anchor was set correctly.
  if (created1.anchoredCanvasMessageId !== assistantMsg.id) {
    throw new Error("anchor was not persisted on created message");
  }
  console.log("  ✓ anchor persisted");

  console.log("\nCleaning up test data...");
  // Soft-delete everything we created.
  await prisma.message.updateMany({
    where: { conversationId: { in: [canvasConvA.id, canvasConvB.id, chatConvA1.id] } },
    data: { deletedAt: new Date() },
  });
  await prisma.conversation.updateMany({
    where: { id: { in: [canvasConvA.id, canvasConvB.id, chatConvA1.id] } },
    data: { deletedAt: new Date() },
  });
  // Hard-delete learnings (no soft-delete on Learning model in this script; test fixtures only).
  await prisma.learningConversation.deleteMany({
    where: { learningId: { in: [learningA.id, learningB.id] } },
  });
  await prisma.learning.deleteMany({
    where: { id: { in: [learningA.id, learningB.id] } },
  });
  console.log("  ✓ cleanup complete");

  console.log("\n✅ All discussion validator checks passed.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
