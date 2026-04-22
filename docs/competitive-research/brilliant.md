# Brilliant — 竞品分析

> **重要程度：** PineSnap 的 UI 设计对标。全屏沉浸式交互学习是 PineSnap 的参考方向。
> **最后更新：** 2026-04-16

## 产品定位

"Learn by doing"。交互优先的 STEM 学习平台，覆盖数学、科学、计算机科学。没有视频，一切都是交互式的：操作图表、重排代码、与数据互动。

**官网：** https://brilliant.org/
**用户规模：** 1000 万+

## 核心功能

1. **交互优先：** 完全没有视频课程。所有学习内容都是交互式的。
2. **引导式问题解决：** 通过引导性的问题逐步带用户理解概念
3. **视觉化解释：** 大量使用可交互的图表和动画来解释抽象概念
4. **自适应路径：** 清晰的课程进度和学习路径，同时保留选择自由
5. **Rive 动画：** 使用 Rive 为学习体验注入活力和激励（连续打卡功能等）

## 界面设计分析（基于实际使用截图）

### 全屏学习画布
- **完全沉浸：** 没有侧栏，没有聊天，没有导航。只有学习内容。
- **顶部进度条：** 简洁的绿色进度指示，显示当前位置。
- **内容区域：** 说明文字 + 交互组件居中展示，大量留白。
- **底部操作栏：** "Check" 按钮。答对后变为 "Correct! +15 XP" + "Why?" + "Continue"。

### 交互组件类型（从截图观察到的）
- **像素滑块：** 拖拽调整图片像素值（0-255），实时看到视觉变化
- **Check 按钮：** 统一的答案提交方式
- **Explanation 弹窗：** 简洁的模态框解释答案（"A black pixel has value 0."）
- **Why? 按钮：** 答对后可选择查看深层解释

### 设计理念
- **极致精简：** "sweats the details of removing as much from the interface as it can"
- **UX + 游戏设计：** 与 ustwo 合作，将游戏设计原则融入产品设计
- **交互 = 学习：** 不是先看内容再做题，交互本身就是学习过程
- **最小化 UI：** 砍掉仅有微小增量的功能，每个 UI 元素和交互都显而易见

## 对 PineSnap 的启示

### PineSnap 的 UI 对标方向
Brilliant 的全屏学习画布是 PineSnap 学习页面的直接参考：
- **全屏画布 + 抽屉式聊天** = Brilliant 的沉浸感 + AI 的对话能力
- **A2UI 组件 = Brilliant 交互组件的 AI 原生版本。** Brilliant 的每个交互都是人工设计的，PineSnap 的由 AI 动态生成。
- **底部操作栏** = Brilliant 的 "Check" / "Correct!" / "Why?" / "Continue" 模式

### A2UI 组件路线图（参考 Brilliant）
Brilliant 的交互组件种类非常丰富。PineSnap 的 A2UI 组件库应该向这个方向发展：

| Brilliant 组件 | PineSnap A2UI tool | 优先级 |
|---------------|-------------------|--------|
| 选择题 | renderQuizSingle ✅ 已有 | — |
| 多选题 | renderQuizMultiple ✅ 已有 | — |
| 填空 | renderFillInBlank ✅ 已有 | — |
| 是/否分支 | renderSocraticBranch（计划中） | P0 |
| 滑块/数值调节 | renderSlider | P1 |
| 拖拽排序 | renderDragSort | P1 |
| 概念连线 | renderConceptConnect（计划中） | P2 |
| 可交互图表 | renderInteractiveChart | P2 |
| 代码编辑器 | renderCodeEditor | P2 |

### 核心差异
- Brilliant 的内容是人工策划的课程，PineSnap 的内容来自用户收藏（推送式）
- Brilliant 是拉取式（用户选择课程），PineSnap 是推送式（AI 从收藏中生成）
- Brilliant 没有 AI 对话能力，PineSnap 有抽屉式聊天作为安全网
- Brilliant 的交互组件是预设的，PineSnap 的 A2UI 组件由 AI 动态决定使用哪个

## 信息来源

- [Brilliant 官网](https://brilliant.org/)
- [Brilliant x ustwo 合作案例](https://ustwo.com/work/brilliant/)
- [Brilliant 如何用 Rive 动画激励学习者](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations)
- [Brilliant 品牌刷新](https://pcho.medium.com/a-brilliant-brand-refresh-4af021c11486)
- 用户实际使用截图（2026-04-16，像素值交互课程）
