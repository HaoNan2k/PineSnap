# 任务清单：连接 Bilibili（一键启用采集）

- [x] 定义“连接 Bilibili”能力的 delta spec（面向普通用户的入口、说明与撤销语义）
- [x] 实现连接页 `/connect/bilibili`（说明 + 一键启用入口）
- [x] 实现安装端点：生成/轮换授权并返回个性化安装脚本（内置 PineSnap URL 与授权）
- [x] 更新右上角入口文案与引导文档（不暴露 Userscript/token 概念）
- [ ] 手动验收（@Browser）：连接 → 安装 → B 站触发采集 → PineSnap 可见对话；断开连接后采集请求失败

