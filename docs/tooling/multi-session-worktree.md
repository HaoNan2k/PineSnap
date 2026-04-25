# 多会话冲突时切 Worktree 工作模式

## 适用场景

同一个 PineSnap 仓库正在被多个 Claude Code / Conductor 会话并行修改时，单个 worktree 会出现：

- Edit 工具看似改了文件，再 Read 又是原状（被另一会话还原）
- `git status` 突然显示分支被切换（reflog 看到外部 `checkout`）
- 工作区里冒出非自己造成的 untracked 文件

这意味着**不能继续在主 worktree 里工作**——任何改动都可能被另一会话覆盖。

## 操作步骤

### 1. 确认是多会话冲突而不是别的问题

```bash
git reflog | head -10
```

看是否有非本会话发起的 `checkout` / `reset` 记录。如果是，确认下一步。

### 2. 起独立 worktree

基于 `origin/main`（不是本地 main，可能落后于远程）：

```bash
git fetch origin main
git worktree add ../<repo>-<topic> -b feat/<topic-name> origin/main
```

例如本次 debug 页面：

```bash
git worktree add ../PineSnap-debug -b feat/internal-debug-page origin/main
```

### 3. 把必要的非追踪文件搬过去

新 worktree 的工作区是干净的，**`.gitignore` 列出的文件不会自动跟过来**：

```bash
# Supabase / Prisma 等环境变量
cp /path/to/main-repo/.env <worktree>/
cp /path/to/main-repo/.env.local <worktree>/

# 当前进行中的 openspec change（如果用 openspec 流程，change 文件还没 commit）
cp -r /path/to/main-repo/openspec/changes/<change-name> <worktree>/openspec/changes/
```

如果忘了 `.env`，`pnpm install` 的 `prisma generate` 会因 `Missing required environment variable: DIRECT_URL` 失败。

### 4. 装依赖

```bash
cd <worktree>
pnpm install --prefer-offline
```

`node_modules` 不共享，必须独立装。`--prefer-offline` 可以省时（依赖大多已在 pnpm store 里）。

### 5. 在新 worktree 里完成功能

之后所有 Edit / Read / Bash 都使用 worktree 的绝对路径。tool 调用上相当于换了项目根目录。

### 6. 收尾：commit 后 prune

```bash
cd <worktree>
git add <具体文件，不要 git add -A>
git commit -m "..."

# 回主 worktree 后
git worktree remove ../<repo>-<topic>
```

worktree 删了，分支保留在仓库里，主 worktree 后续可以 `git checkout feat/<topic-name>` 接着改。

## 为什么不用 stash 或单一 worktree

| 替代方案 | 为什么不行 |
|---------|----------|
| `git stash` 主 worktree 的改动 | stash 的是另一个会话正在改的文件，会破坏对方进度 |
| 强行在主 worktree 切分支 | 另一会话会把分支拽回去 |
| 等另一个会话结束 | 不知道什么时候结束，且阻塞当前任务 |

**Worktree 提供物理隔离**——两个工作区共享同一 `.git`，但工作树完全独立，互不干扰。

## 提示用户的话术

发现冲突症状时，向用户报告并等待确认，不要擅自切 worktree（用户可能正在另一个会话做有意为之的操作）：

> 我观察到 [症状]，看起来有别的会话在改这个仓库。要不要我起一个独立 worktree（在 `../<repo>-<topic>` 下）继续做这次的 work？

## 真实案例

`add-debug-page-phase0`（2026-04-25）：实现到一半发现 server 文件被还原 + 分支被切回，切到 `../PineSnap-debug` worktree 完成；commit 后 prune，分支留在主仓等合并。
