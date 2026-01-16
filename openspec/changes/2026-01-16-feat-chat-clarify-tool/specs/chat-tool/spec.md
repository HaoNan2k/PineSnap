# Spec: Learning Module & Chat Tool

## ADDED Requirements

### Requirement: Multi-Resource Learning
The system MUST support learning sessions that aggregate multiple resources.

- **MUST** Many-to-Many: Learning entities must be able to relate to multiple Resource entities.
- **MUST** Unified Context: The AI system context must include content from all linked resources.

#### Scenario: Create Learning from Multiple Sources
- **GIVEN** User selects Resource A and Resource B.
- **WHEN** User clicks "Create Learning".
- **THEN** A single Learning entity is created linked to both A and B.
- **AND** The user is redirected to `/learn/[learningId]`.

### Requirement: Server-side Initialization
The system MUST ensure a conversation context exists before the user starts interacting.

- **MUST** Initialize on Load: When accessing `/learn/[learningId]`, the server must retrieve/create a linked conversation.

#### Scenario: First Visit
- **GIVEN** A user accessing a learning page.
- **WHEN** The page loads.
- **THEN** The chat interface initializes with a valid conversation ID.

### Requirement: Plan Generation
The system MUST persist the generated plan.

- **MUST** Persist Artifact: Plan generation updates `Learning.plan`.
- **MUST** Store Clarify Payload: Clarify questions/answers must be saved in `Learning.clarify`.

#### Scenario: Plan Creation
- **GIVEN** User submits clarification.
- **WHEN** The system generates the plan.
- **THEN** The plan content is saved to DB and displayed in UI.

### Requirement: Clarify is a Separate Stage
The system MUST run Clarify before chat and keep it out of chat history.

- **MUST** Separate Flow: Clarify questions/answers are not stored as chat messages.
- **MUST** Gate Chat: Normal chat starts only after a plan exists.
- **MUST** JSON Output: Clarify generation MUST return structured JSON in a single model call.
- **MUST** ID Normalization: The system MUST assign ids for questions/options when persisting Clarify results.

#### Scenario: First Visit Without Plan
- **GIVEN** A learning page without `Learning.plan`.
- **WHEN** The page loads.
- **THEN** The system requests Clarify questions and shows a form.
- **AND** Chat history remains empty until plan generation completes.

### Requirement: Clarify Question Types (V1)
Clarify MUST support only single choice and multi choice in the first version.

- **MUST** Single Choice: A question MAY have exactly one selected option.
- **MUST** Multi Choice: A question MAY have multiple selected options.
- **MUST NOT** Free Text: Open-ended answers are excluded in V1.
- **MUST NOT** Re-answer UI: The UI MUST NOT show a "re-answer" button in V1.

#### Scenario: Render Choice Form
- **GIVEN** Clarify questions with single/multi choice.
- **WHEN** The user opens the form.
- **THEN** The UI renders choice controls and allows submission only with valid answers.
