# 0005 — Resource Summary：从沉浸式 artifact 转向产品内文档

- 日期：2026-04-26
- 状态：accepted
- 关联：`openspec/changes/redesign-resource-summary-as-document/`
- Commit：`38c2c9d`

## 背景

Resource Summary 第一版（v1）让 AI 直接产出整页 HTML，用跨子域 iframe 全屏渲染。
用户反馈三个症状：

1. 文档左上角漏出 ` ```html ` markdown fence
2. AI 风格强烈（暗色 grid、紫色渐变、自定义动效），和 PineSnap 整体设计语言脱节
3. 全屏 iframe + 隐藏 hover 返回按钮 → 用户感觉"出不去了"

症状指向三层根因：

- **路由层**：`/summary/[id]` 在 `(main)` 路由组之外，`MainLayoutWrapper` 的左侧导航消失
- **数据层**：让 AI 自由生成可执行 HTML 是不可控的，prompt 怎么改都治标不治本
  （fence 泄漏只是 generateText + 自由 HTML 这条路径的众多失败模式之一）
- **产品层**：定位错了——summary 应该是 PineSnap 内的"一篇文档"，不是 AI 放飞的 artifact

## 候选方案

| 方案 | 优点 | 缺点 |
|---|---|---|
| A. 套壳 | 改动小：保留 AI 出 HTML，外面包 PineSnap 顶栏；fence bug 顺手补 | 治标不治本：里外两套设计语言反而更别扭；HTML 输出的不可控性原封不动 |
| B. 重做成结构化文档 | 改动中：AI 出 markdown + JSON，产品自己渲染；和 Notion 文档体感对齐 | 失去"艺术家放飞"的视觉花活，但换来风格统一和可控性 |

## 决策

选 **B**。Summary 改为 1:1 关系的结构化文档（`markdown` 主体 + `keyMoments` JSON），
在 `(main)` 路由组下的 `/sources/[resourceId]` 渲染。
AI 调用从 `generateText` 切到 `generateObject` + Zod schema。

## 理由

最核心的认知是 **"AI 输出可执行内容 vs 结构化内容"** 的取舍：

- **可执行内容（HTML/JS/完整页面）的成本**：
  - 协议层不可控——模型会包 markdown fence、加解释段落、改格式
  - 风格层不可控——prompt 控不住"AI 味"，越约束越像匠气堆砌
  - 安全层成本——必须做沙盒（跨子域 iframe + CSP + 签名 token），平添运维复杂度
- **结构化内容（JSON via tool calling / structured output）的优势**：
  - 协议层从根上消除 fence 泄漏（schema 校验失败直接重试，不会有"几乎对"的输出落到用户面前）
  - 风格由产品代码决定，全站设计语言天然一致
  - 不需要沙盒，不需要跨子域路由

套壳方案（A）只解决了第三个症状，对前两个根因无能为力。
做一次重构把三层根因一起治，长期成本比"先套壳再改"低。

这条原则适用于其它 AI 功能：**让 AI 决定"说什么"，让产品代码决定"长什么样"**。

## 影响

- **删除**：`app/summary/`、`components/summary/artifact-fab.tsx`、
  `components/sources/summary-drawer.tsx`、`lib/summary/{validate,artifact-token}.ts`、
  artifact 子域 + 签名 token 整套机制
- **数据迁移**：`ResourceSummary` 从多版本一对多 → 1:1（`resourceId` unique），
  字段从 `html` → `markdown` + `oneLineSummary` + `keyMoments`，
  v1 数据丢弃（功能上线时间不长）
- **新增依赖**：`react-markdown`、`@tailwindcss/typography`
- **回滚成本**：高。本次是破坏性 schema 变更，且 v1 的子域配置/签名机制已删除。
  紧急回滚方案：临时下线"生成总结"入口，保留路由但不允许新生成
