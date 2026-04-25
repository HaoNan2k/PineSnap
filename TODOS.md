# TODOS

跨多个 PR、暂时不阻塞当前工作、但值得将来处理的事项。新增项目请附：**What / Why / Pros / Cons / Context / Depends on**。

---

## 引入前端测试框架（vitest + 关键路径单测）

**Status update (2026-04-25):** `generalize-capture-extension` change 已经决定先在扩展 / extractor 范围内引入 vitest + jsdom + fixture 测试（task 0）。本条 TODO 收敛为"将测试覆盖扩展到 React 组件 / hook 层"。

**What:** 为项目添加 `vitest` 运行时 + 一组关键路径的单元测试（组件状态切换、关键 hook 逻辑、用户交互分支）。可选地后续补 `playwright` 做 E2E。

**Why:** 当前项目只有 `tsc --noEmit` + `eslint` 作为 Health Stack，没有任何 unit / integration / E2E 测试。`redesign-canvas-chat-ux-language` 变更中发现的 Issue #1（历史态 Continue 语义）就是因为没有回归测试才被字面 "逻辑不变" 说辞盖过去。随着学习画布 + 讨论 sidebar + 底栏导航的交互复杂度上升，单靠手工 QA 会越来越不靠谱。

**Pros:**
- 回归能自动检测（尤其是历史态 vs 实时态的分支逻辑）
- CI 里加一道保护网，让 PR 审查更轻
- TypeScript 无法覆盖的运行时行为（动画、事件监听器、状态同步）能被测到

**Cons:**
- 初始投入：配置 vitest + React Testing Library + 迁移第一批测试约半天
- 长期维护成本：约 10-20% 的开发时间在写/修测试
- UI 视觉变更的测试价值相对低，更多价值在 hook 和状态分支

**Context:**
- `redesign-canvas-chat-ux-language` 中发现的关键分支：
  - `learn-focus.tsx:431-439` 的 `handleNext` / `handleContinue` 的历史态分支
  - `canContinue` 在历史态下的语义差异
  - Cmd+/ 监听器被上提后容易重复注册
- 如果立项，推荐先覆盖：canvas-step-navigation 逻辑、useDiscussionChat hook、ChatToggleButton 状态切换

**Depends on / blocked by:** 无。可独立启动。

---

## 服务端 web_extract 抓取 handler（解锁非扩展入口）

**What:** 在 `worker/main.ts` 注册 `web_extract` 的 handler，逻辑为：用 `fetch(sourceUrl)` 拉 HTML，用 Defuddle 抽取 → 落 `extracted_text + format=markdown` artifact。

**Why:** `generalize-capture-extension` 已经把 worker dispatcher 泛化为 jobType handler map，但本 PR 故意没注册 web_extract handler（YAGNI，扩展端会同步预抽，不进队列）。未来要打通：
- 移动端 share extension（iOS / Android）
- 邮件转发收件人（forward to clip@…）
- Public API（用户用 curl 提交 URL）
- RSS 订阅源
任一入口都需要"只给 URL，服务端自己抽"的能力。

**Pros:**
- 解锁多入口（移动端 + 邮件 + RSS + API）
- 与扩展路径输出契约一致（`extracted_text + format=markdown`），下游学习模块零改动
- 复用扩展端用过的 Defuddle，成熟低风险

**Cons:**
- 服务端 fetch 看不到登录态、SPA 渲染、付费墙，质量下限明显低于扩展
- 反爬会让公众号 / 知乎类站点直接死掉，需要 fallback 策略
- 引入 server 端 npm 依赖 Defuddle，要注意与扩展 bundle 的版本一致

**Context:**
- 服务端入口契约已经留好（`POST /api/capture/jobs` 不带 artifact 时进队列即可）
- worker dispatcher 在 `worker/main.ts:JOB_HANDLERS` map 注册一行即可启用
- 推荐先做 fetch + Defuddle 两个核心步骤，反爬 fallback 再迭代

**Depends on / blocked by:** `generalize-capture-extension` 完成后启动。

---

## 扩展 Defuddle 懒加载（性能优化）

**What:** 把 Defuddle 从 manifest content_scripts 注入移到 `chrome.scripting.executeScript` 用户点击后动态注入。

**Why:** 当前所有页面加载会注入 ~30-40KB gzipped 的 Defuddle，对偶尔使用扩展的用户是浪费。Obsidian Web Clipper 用懒加载模式，性能更好。

**Pros:**
- 普通页面浏览开销降到接近 0（只剩按钮 mount 几 KB）
- 扩展商店权限说明可能更友好

**Cons:**
- 引入 `chrome.scripting` 权限（虽然 MV3 标准）
- 调试链路变长（动态注入失败的诊断更难）
- 复杂度换的性能在 MB 级页面里看不出区别

**Context:**
- `generalize-capture-extension` 故意先做"eager + 简单"，等真实场景验证性能再优化
- 真要做时，extractor-registry.js 的 SITE_ADAPTERS 不变，只改 content.js 的"加载 Defuddle"时序

**Depends on / blocked by:** `generalize-capture-extension` 完成后启动。

---

## 小红书 / Twitter / X / GitHub README 等长尾站点 extractor

**What:** 按用户实际使用频率，为剩余高频站点写专用 extractor。

**Why:** `generalize-capture-extension` 只做了通用 + 公众号 + 知乎 + B 站 + YouTube 五个 P0/P1。剩余的：
- 小红书：图 > 文，需要图片下载 + OCR
- Twitter / X：线程结构，多条合并
- GitHub README / Stack Overflow：代码块、嵌入引用
- 即刻 / 小宇宙 / 飞书文档 / 钉钉文档 / Notion 公开页 / 简书 / Substack ……

**Pros:** 覆盖更多用户素材
**Cons:** 长尾站点维护成本高，反爬变化频繁
**Context:** 等用户实际收藏数据看哪个频次最高再优先级排序，不要"先写一堆没人用的"

**Depends on / blocked by:** `generalize-capture-extension` 完成后启动。每个站点独立可加。
