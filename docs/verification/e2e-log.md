# E2E 验证记录

记录每次端到端验证的输入、环境、结果，作为功能可用性的留档依据。

## 验证脚本

| 脚本 | 用途 | 依赖外部 |
| --- | --- | --- |
| `scripts/e2e-full-capture-pipeline.ts` | 本地全链路（mock ASR 或真实 ASR） | 需 `pnpm dev` |
| `scripts/sim-extension-to-cloud-worker.ts` | 模拟扩展 → 云 worker 真实转写 | 需云 worker 运行 |
| `scripts/e2e-verify-capture-job.ts` | 只验证 API 创建 job，不等 worker | 需 `pnpm dev` |

## 记录模板

每次验证复制以下模板，填入实际数据。

```
### YYYY-MM-DD — <简要说明>

**环境**
- 脚本: `scripts/xxx.ts`
- 代码版本: `git rev-parse --short HEAD` → <commit hash>
- 运行位置: 本地 / 云 worker
- ASR 模式: mock / 真实 AssemblyAI
- Next.js dev: http://127.0.0.1:<port>

**输入**
- sourceUrl: <B 站视频链接>
- mediaCandidates: <有/无，URL 前缀或说明>
- 环境变量: E2E_BV=..., E2E_MEDIA_CANDIDATE_URL=...（脱敏）

**执行命令**
```bash
<实际执行的命令>
```

**结果**
- job status: SUCCEEDED / FAILED
- jobId: <uuid>
- artifact.source: media_candidate / yt_dlp
- artifact.text preview: <前 80 字>
- 耗时: ~<N>s

**结论**: PASS / FAIL — <一句话说明>
```

---

## 验证记录

> 按时间倒序排列，最新的在最前面。

（暂无记录——待首次 E2E 验证后填写）
