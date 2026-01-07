# Tasks: UI Refactor

## 1. Type Definitions
- [ ] Update `components/chat/types/chat.ts` to include `MessagePart` and update `Message` interface. @components/chat/types/chat.ts

## 2. Input UI Refactor
- [ ] Refactor `MultimodalInput` styling to match v0 design (white bg, shadow, minimal borders). @components/chat/components/multimodal-input.tsx
- [ ] Verify input focus states and hover interactions.

## 3. Data Flow Update
- [ ] Update `ChatArea` mapping logic to preserve `parts` in `mappedMessages`. @components/chat/components/chat-area.tsx
- [ ] Ensure `useChat` hook integration correctly handles `parts` from the SDK.

## 4. Message Rendering
- [ ] Create `FileAttachment` component for displaying file parts in history.
- [ ] Update `MessageItem` to render text parts in bubble and file parts as attachments below. @components/chat/components/message-list.tsx
- [ ] Ensure user/assistant differentiation remains clear.

## 5. Verification
- [ ] Verify sending text-only messages.
- [ ] Verify sending text + file messages.
- [ ] Verify receiving messages with files (if applicable in future, currently mainly user sends files).
- [ ] Check mobile responsiveness.
