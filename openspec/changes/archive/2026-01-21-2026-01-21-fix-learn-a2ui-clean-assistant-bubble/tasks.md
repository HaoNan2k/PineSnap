## Tasks

- [x] Implement `hasTurnOutput(...)` helper for Learn UI gating
  - [x] Define which part types count as “output” in Learn (text/tool/file/source/data)
  - [x] Ensure it does not require extra network requests
  - [x] Implement snapshot diff using fingerprint comparison (prevAssistant vs current)

- [x] Add “in-flight assistant gating” to Learn message rendering
  - [x] When last assistant is in-flight and `hasTurnOutput === false`, render Loading placeholder (or hide)
  - [x] Switch to real bubble once `hasTurnOutput === true`
  - [x] On error/timeout, render a minimal explicit error UI (no inherited content)

- [x] Keep tool UI pruning (last step only) as the default tool rendering rule
  - [x] Ensure new bubble never shows tool UI inherited from previous step
  - [x] Ensure previous bubble still reflects tool state changes immediately (submit/lock)

- [x] Verification
  - [x] Submit tool-result → no flicker of previous UI in the new assistant bubble
  - [x] Refresh/replay → previous tool UI remains locked and consistent
  - [x] New round tool-call → tool UI appears only when model calls tools in that round

- [x] Run `openspec validate 2026-01-21-fix-learn-a2ui-clean-assistant-bubble --strict`

