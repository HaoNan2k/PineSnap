# OpenMAIC — 竞品分析

> **重要程度：** 技术架构参考（多智能体编排）
> **最后更新：** 2026-04-15

## 产品定位

Open Multi-Agent Interactive Classroom（开源多智能体交互课堂）。由清华大学 THU-MAIC 团队开发。将在线教育从被动视频讲座转向主动、个性化、社交化的 AI 驱动课堂。

**官网：** https://openmaic.io/
**GitHub：** https://github.com/THU-MAIC/OpenMAIC
**许可证：** 开源

## 核心功能

1. **多智能体课堂模拟：** AI 教师（不同教学风格）、AI 助教（补充帮助）、AI 同学（参与讨论和辩论）
2. **课程生成流水线：** 两阶段生成
   - 阶段一：分析用户输入（主题或文档），生成结构化课程大纲
   - 阶段二：将大纲转化为幻灯片、测验、交互式 HTML 模拟、项目式学习活动
3. **多模态教学：** 幻灯片 + 语音旁白、测验 + 评分标准、交互模拟、白板绘图
4. **实时讨论：** AI 角色之间可以进行实时讨论和辩论

## 技术架构

- **前端：** Next.js + React + TypeScript + Tailwind CSS
- **多智能体编排：** LangGraph（状态机管理 agent 轮次、讨论、协作交互）
- **LLM 支持：** OpenAI、Anthropic、Google Gemini、DeepSeek，以及任何 OpenAI 兼容 API
- **验证：** 在清华大学 700+ 真实学生中验证

## 对 PineSnap 的启示

### 可以参考的
- **内容生成流水线：** 从原始内容到结构化学习材料的两阶段方法。PineSnap 的 "采集 → AI 消化 → 学习路径" 是类似的理念。
- **多 LLM 支持：** Vercel AI SDK 已经抽象了 provider，这是好的架构选择。

### 不适合 PineSnap 的
- **课堂模拟：** 多个 AI 角色（教师、助教、同学）增加了复杂度但不一定增加学习效果。PineSnap 的苏格拉底一对一更专注。
- **幻灯片/视频生成：** 对于 PineSnap 的场景（消化已有收藏内容）不是核心需求。

## 信息来源

- [OpenMAIC 官网](https://openmaic.io/)
- [OpenMAIC GitHub](https://github.com/THU-MAIC/OpenMAIC)
- [Medium: 清华开源了一整个 AI 学校](https://medium.com/the-ai-studio/china-just-open-sourced-an-entire-ai-school-4f81f4972223)
- [Medium: OpenMAIC 技术分析](https://medium.com/@zoudong376/openmaic-by-tsinghua-an-open-source-multi-agent-ai-framework-for-generative-learning-and-e5a5f3792b62)
