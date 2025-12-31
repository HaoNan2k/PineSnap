# Spec: Chat UI Refactor

## 1. Requirements

### 1.1 Message Structure
The system MUST support structured messages containing both text and file parts.
- Text parts MUST be rendered within the primary message bubble.
- File parts MUST be rendered as visual cards/thumbnails OUTSIDE (below) the primary text bubble.

### 1.2 Input Visuals
The input area MUST mimic the "v0" aesthetic:
- Default state: White background, subtle gray border, slight shadow.
- Focus state: White background, slightly darker border/shadow, NO default browser outline.
- Textarea: Transparent background, no borders.

## 2. Scenarios

### Scenario 1: User Uploads File
Given the user selects a file "image.png"
When the user sends the message "Check this out"
Then the chat history displays:
  1. A text bubble containing "Check this out"
  2. A file card below it showing "image.png" (and thumbnail if image)
And the file card is NOT inside the text bubble.

### Scenario 2: Loading History
Given a conversation exists with file attachments
When the page loads
Then the `ChatArea` correctly maps the stored `jsonb` parts to frontend `MessagePart` objects
And the `MessageList` renders them as separate visual elements (not stringified "Clip ...").
