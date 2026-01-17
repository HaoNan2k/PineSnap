# Design: Learning 模块与澄清工具

## 核心概念

- **Learning Artifact**: 聚合了多个 Resource 的学习单元，存储 Plan。
- **Many-to-Many**: 一个 Learning 可以包含多个 Resource。
- **Unified Route**: 所有学习行为均在 `/learn/[learningId]` 进行。

## SDK 版本约束 (Context Cache)
> **基于 ai@6.0.0-beta.141**
- **Message Type**: `ModelMessage`。
- **Role**: `system | user | assistant | tool`。

## 数据模型 (Schema)

### 1. Learning (多对多 Resource)
```prisma
model Learning {
  id          String   @id @default(uuid(7))
  plan        String?  @db.Text 
  clarify     Json?    @db.JsonB
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  // 多对多关联资源
  resources   LearningResource[]
  
  // 关联对话
  conversations LearningConversation[]
}

// Learning-Resource 中间表
model LearningResource {
  learningId  String
  resourceId  String
  createdAt   DateTime @default(now())
  learning    Learning @relation(fields: [learningId], references: [id])
  resource    Resource @relation(fields: [resourceId], references: [id])
  @@id([learningId, resourceId])
}
```

### 2. Learning-Conversation (中间表)
```prisma
model LearningConversation {
  learningId     String
  conversationId String
  createdAt      DateTime @default(now())
  learning       Learning     @relation(fields: [learningId], references: [id])
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  @@id([learningId, conversationId])
  @@index([conversationId])
}
```

### 3. Roles
```prisma
enum Role {
  user
  assistant
  system
  tool 
}
```

## 交互流程 (User Journey)

### 1. 创建 (Creation)
- **UI**: 在 `/sources` 列表页选择多个 Resource。
- **Action**: 点击 "Create Learning"。
- **Backend**: 创建 `Learning`，写入 `LearningResource` 关联。
- **Redirect**: 跳转至 `/learn/[learningId]`。

### 2. 初始化 (SSR - /learn/[learningId])
- **Page Component**:
  - 获取 `learningId`。
  - 获取关联的 `resources` (用于 Context 构建)。
  - **Context Logic**: 如果没有 Conversation，创建一个新的并关联（用于后续 Chat 阶段）。

### 3. 自动澄清 (Clarify Stage)
- **Trigger**: 页面进入后自动请求 Clarify（不进入 Chat）。
- **Question Types**: 仅支持单选与多选。
- **Persistence**: `Learning.clarify.questions` 记录问题集；`Learning.clarify.answers` 记录用户答案。
- **UI**: 以表单形式展示澄清问题（不在聊天消息内），不提供“重新回答”按钮。
- **生成方式**: Clarify 仅进行一次模型请求，要求输出结构化 JSON（非工具调用）。

### 4. 生成 Plan
- **Action**: 用户提交澄清表单。
- **Backend**: 基于澄清问答生成 Plan。
- **Persistence**: `Learning.plan` 更新。
- **UI**: Plan 显示后进入正常 Chat。

### 5. 正常 Chat
- **Context**: System Prompt 包含 Resources Context + Learning.plan（可选包含 Clarify 摘要）。
- **History**: 仅保存 Plan 之后的正常对话消息。

## Clarify 数据结构
澄清信息作为 Learning 的 `clarify` 字段保存（JSONB），用于复现与生成：

```ts
type ClarifyQuestion =
  | {
      id: string;
      type: "single_choice";
      prompt: string;
      options: Array<{ id: string; text: string }>;
    }
  | {
      id: string;
      type: "multi_choice";
      prompt: string;
      options: Array<{ id: string; text: string }>;
    };

type ClarifyAnswer =
  | { questionId: string; type: "single_choice"; optionId: string }
  | { questionId: string; type: "multi_choice"; optionIds: string[] };

type ClarifyPayload = {
  questions: ClarifyQuestion[];
  answers?: ClarifyAnswer[];
  askedAt: string; // ISO
  answeredAt?: string; // ISO
};
```

### Clarify 生成输入（模型输出）
Clarify 生成仅要求模型输出简化结构，服务端负责补齐 id：

```ts
type ClarifyQuestionDraft = {
  type: "single_choice" | "multi_choice";
  prompt: string;
  options: string[];
};

type ClarifyDraftOutput = {
  questions: ClarifyQuestionDraft[]; // 长度固定为 3
};
```

## API 设计

> **⚠️ 已废弃（Superseded）**：本提案中的 `POST /api/learn/clarify` 和 `POST /api/learn/plan` 已被 **`optimize-learning-auth-ssr`** 变更中的 tRPC procedures（`learning.generateClarify`、`learning.generatePlan`）取代。实现阶段 MUST 以新变更为准。

### `POST /api/learn/clarify`（已废弃，请使用 `learning.generateClarify` tRPC procedure）
- **Request**: `{ learningId }`
- **Response**: `{ ok, questions }`
- **Behavior**:
  - 使用多素材 Context 生成 Clarify questions（单次 JSON 输出）
  - 仅生成单选/多选题
  - 服务端为 questions/options 补齐 id 后再持久化
  - 将 questions 持久化至 `Learning.clarify`

### `POST /api/learn/plan`（已废弃，请使用 `learning.generatePlan` tRPC procedure）
- **Request**: `{ learningId, answers }`
- **Response**: `{ ok, plan }`
- **Behavior**:
  - 校验 answers 与 questions 匹配
  - 生成并持久化 `Learning.plan`
  - 更新 `Learning.clarify.answers`
