# 竞品调研

本目录记录 PineSnap 的竞品调研信息，包括产品定位、核心特点、差异化分析。

## 竞品列表

| 竞品 | 定位 | 与 PineSnap 的关系 | 文档 |
|------|------|-------------------|------|
| **HyperKnow** | AI 主动学习代理 | 最接近的竞品，同为"主动式"AI 学习 | [hyperknow.md](./hyperknow.md) |
| **Duolingo** | 游戏化语言学习 | 交互设计参考（A2UI 组件灵感） | [duolingo.md](./duolingo.md) |
| **Brilliant** | 交互优先的 STEM 学习 | **UI 设计对标**。全屏沉浸式交互学习是 PineSnap 的参考方向 | [brilliant.md](./brilliant.md) |
| **OpenMAIC** | 多智能体 AI 课堂 | 技术架构参考（多 Agent 编排） | [openmaic.md](./openmaic.md) |
| **Gemini Guided Learning** | Google 的 AI 导学功能 | 大厂同方向，验证市场需求 | [gemini-guided-learning.md](./gemini-guided-learning.md) |
| **Quizlet** | 闪卡学习平台 | 大众化学习工具参考 | [quizlet.md](./quizlet.md) |

## PineSnap 的差异化定位

```
                    主动式 ────────────────── 被动式
                      │                        │
                      │  PineSnap    HyperKnow  │
                      │  (无感采集    (上传课件   │
                      │   → AI 推送)  → AI 规划) │
  交互式 ─────────────┤                        ├── 文本式
  (A2UI 组件)         │                        │   (聊天)
                      │  Brilliant   Gemini    │
                      │  (交互练习)  (导学聊天) │
                      │                        │
                      │  Duolingo    Quizlet   │
                      │  (游戏化)    (闪卡)    │
                      └────────────────────────┘
```

**PineSnap 独占的象限：主动式 + 交互式（A2UI）。**

- HyperKnow 是"主动式"但主要还是文本聊天 + 文档问答
- Brilliant 是"交互式"但需要用户主动去学
- PineSnap 同时做到两者：无感采集 → AI 主动推送 → A2UI 交互组件学习

## 调研更新记录

| 日期 | 更新内容 |
|------|---------|
| 2026-04-15 | 初始调研：HyperKnow、Duolingo、Brilliant、OpenMAIC、Gemini、Quizlet |
