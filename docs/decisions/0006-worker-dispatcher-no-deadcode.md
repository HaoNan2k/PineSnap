# 0006 — Worker dispatcher 泛化但拒绝写无调用方的 handler

- 日期：2026-04-25
- 状态：accepted
- 关联：`generalize-capture-extension` change（archive: `2026-04-25-generalize-capture-extension`）
- 相关 PR：#15

## 背景

Phase C 把 `worker/main.ts` 从 "硬编码 `jobType: 'audio_transcribe'` 单一过滤" 重构为 "`JOB_HANDLERS: Map<CaptureJobType, JobHandler>` 多 handler 调度"。

讨论中很自然冒出一个想法：**既然 dispatcher 已经泛化，是不是顺手把 `web_extract` handler 也实现了？** 实现内容会是 "服务端 fetch URL + Defuddle 抽取"，正好对应未来的 移动端 share / 邮件转发 / Public API 等"只给 URL 不带 artifact"的入口。

## 候选方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **A. 只重构 dispatcher 形态，不实现 `web_extract` handler** ✅ | 死代码 = 0；JOB_HANDLERS map 小、好理解；未来真有调用方时再加 ~30 行 | 新写一个"看起来空缺"的 jobType handler 表会被误读为遗漏 |
| B. 顺手实现 `web_extract` Defuddle 服务端抓取 handler | dispatcher 与文档自洽 | ~150 行死代码：扩展端预抽 + POST /api/capture/jobs 同步落库的路径不进 worker 队列；零调用方；fetch + Defuddle 上线 N 个月没真实流量验证，到真实用上时 90% 概率要重写 |

## 决策

**采用方案 A**。

代码上：

- `JOB_HANDLERS` map 当前只注册 `audio_transcribe → handleAudioTranscribe`
- `claimPendingCaptureJobs` 新增 `jobTypes?: CaptureJobType[]` 多值过滤参数
- worker 只领白名单 jobType（`SUPPORTED_JOB_TYPES = Array.from(JOB_HANDLERS.keys())`）
- 防御分支（理论不触发）：claim 后若 jobType 没注册 handler，标记 `UNSUPPORTED_JOB_TYPE`

文档上：

- `worker/main.ts` 的 JOB_HANDLERS 旁注释清楚说明：`web_extract` 故意未实现，未来要做时在何处加
- `TODOS.md` 一条独立条目"服务端 web_extract 抓取 handler"，描述触发场景 + 大致工作量

## 为什么是 YAGNI 而不是"未雨绸缪"

Y - You  
A - Aren't  
G - Gonna  
N - Need  
I - It

经典 YAGNI 反对意见："为未来留口子是好事啊"。但这里有几个具体反例：

1. **死代码不可信**。没有调用方就没有压力测试。等真用时，半年前的 fetch 实现可能已经因为依赖升级 / API 变化失效了
2. **无调用方的 handler 让 schema 充满"理论上支持"的承诺**。下游消费者会基于 spec 写代码，结果运行起来发现是空壳
3. **dispatcher 形态本身已经泛化好了**。新增 handler 是 ~30 行 + 注册一行 map entry 的事，不需要现在就放进去
4. **真要做服务端抓取时，需求会更具体**。比如"为 iOS share extension 接入"会明确"需要把 share sheet 的 URL 送进来"，那时候才知道 fetch 是用 server-side fetch 还是 user-agent pretend、是否需要登录态 cookie、是否限制域名等具体决策点

## 后续应该怎么做

未来要新增 worker handler 时：

1. 确认有真实调用方（哪个入口在生成这个 jobType 的作业）
2. 在 `worker/main.ts` 实现 handler 函数
3. `JOB_HANDLERS.set("xxx", handleXxx)` 加一行
4. `pnpm test`，关注现有测试是否有回归
5. 部署时确认 worker 重启拉新代码（`SSH + git pull + systemctl restart`）

## 教训

- 重构带来的"看起来缺失的位置"是错觉，不是技术债
- 用 TODOS.md 显式记录"故意未实现"比留死代码占位更诚实
- 对长寿后台进程而言（参考 worker 那次连接池死锁事故），代码越少 bug 面越小
