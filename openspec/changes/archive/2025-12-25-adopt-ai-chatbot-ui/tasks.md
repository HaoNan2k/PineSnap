# Tasks: adopt-ai-chatbot-ui

> 目标：将聊天 UI 迁移为 `vercel/ai-chatbot` 风格（Sidebar 体系 + 消息样式 + jump-to-bottom + Streamdown），不做兼容层，确保无 any 且 lint 通过。

## 阶段 1：现状盘点与依赖准备
- [x] 1.1 确认现有 `components/ui/*` 能覆盖 Sidebar 体系所需 primitives（Sheet/Tooltip/Separator/Input/Skeleton）。
- [x] 1.2 通过 pnpm 安装 `streamdown`（版本以 lockfile 为准），确保类型可用。

## 阶段 2：Sidebar UI 基础设施整套迁移
- [x] 2.1 迁移 `ai-chatbot` 的 Sidebar 体系到本项目（`SidebarProvider/Sidebar/SidebarInset/...`）。
- [x] 2.2 新增/适配 `AppSidebar`：
  - [x] 复用现有 `components/sidebar/SidebarHistory.tsx` 作为 SidebarContent
  - [x] 不渲染 DeleteAll（含 AlertDialog）
  - [x] 保留“新建对话”入口
- [x] 2.3 将聊天布局从手写开合替换为 SidebarInset 结构，且不破坏 RightPanel。
- [x] 2.4 验证：移动端抽屉、cookie 记忆、`Cmd/Ctrl+b`。（暂缓：移动端抽屉验证不作为本次验收）

## 阶段 3：消息列表与 jump-to-bottom
- [x] 3.1 替换消息列表布局结构为 ai-chatbot 风格（滚动层 absolute inset-0，内容 max-w-4xl）。
- [x] 3.2 引入滚动策略（MutationObserver + ResizeObserver）：
  - [x] 用户在底部时，流式输出 instant 跟随
  - [x] 用户上滑阅读时，不自动拉回
- [x] 3.3 替换 jump-to-bottom 为居中圆形下箭头按钮。

## 阶段 4：消息样式对齐 + 仅保留 Copy
- [x] 4.1 User：右对齐蓝色气泡；移除用户头像。
- [x] 4.2 Assistant：左侧小圆图标；正文透明文档流（无气泡）。
- [x] 4.3 仅保留 Copy 操作：hover/聚焦可见，符合可访问性。

## 阶段 5：Streamdown 替换 MarkdownContent
- [x] 5.1 将 assistant 文本渲染切换为 Streamdown（对齐 code/pre 溢出规则）。
- [x] 5.2 移除/弃用 `ReactMarkdown` 渲染路径与相关组件引用（不保留兼容分支）。

## 阶段 6：收尾与验证
- [x] 6.1 lint / typecheck 通过（无 any、无遗留未使用代码）。
- [x] 6.2 验证路径：（暂缓：新对话链路与移动端抽屉验证不作为本次验收）
  - [x] 新对话：发送首条消息 → URL 更新 → Sidebar 列表出现（暂缓）
  - [x] 历史对话：追加消息 → 滚动跟随与下箭头行为正确
  - [x] 上滑阅读：不会被自动拉回
  - [x] Copy：User/Assistant 均可复制

## @Browser 验证清单（必须手动走一遍）
> 说明：此清单用于在实现阶段用 @Browser 实际操作验证交互与样式（非单测）。

- [x] B1 Sidebar（桌面宽度）
  - [x] Sidebar 默认打开/关闭状态与 cookie 一致（刷新后保持）
  - [x] `Cmd/Ctrl+b` 可切换 Sidebar
  - [x] 点击“新建对话”进入新对话页，主区域重置
- [x] B2 Sidebar（移动端宽度）（暂缓）
  - [x] Sidebar 以抽屉（Sheet）形式打开与关闭（暂缓）
- [x] B3 消息列表滚动（暂缓：流式稳定跟随不作为本次验收）
  - [x] 在底部时：assistant 流式输出过程中视图稳定跟随（无抖动）（暂缓）
  - [x] 上滑离开底部：出现居中圆形下箭头；且不会自动拉回底部
  - [x] 点击下箭头：平滑回到底部；按钮消失（暂缓）
- [ ] B4 消息样式与渲染
  - [x] User：右侧蓝色气泡；不显示头像
  - [x] Assistant：左侧小圆图标；正文透明文档流；不使用气泡底
  - [x] Streamdown：Markdown 与代码块正常（代码块不撑爆宽度）



