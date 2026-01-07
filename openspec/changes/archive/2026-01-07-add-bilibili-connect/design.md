# 设计：连接 Bilibili（一键启用采集）

## 用户体验（MVP）

### 入口

- 临时入口：右上角用户菜单提供“连接 Bilibili”入口
- 进入后打开 `/connect/bilibili`

### 连接页内容

连接页 SHALL 提供：

- 该连接能实现什么：
  - 在 B 站视频页一键采集字幕并写入 PineSnap（创建对话）
- 以后需要如何操作：
  - 断开连接（撤销授权）
  - 重新连接（会轮换授权）

### 一键启用

点击“一键启用”后：

- 服务端为当前用户生成授权（scope：`capture:bilibili`）
- 系统返回一个“浏览器连接器安装文件”（对用户表现为“安装/更新一个连接器”）
- 用户只需确认安装，无需复制 token 或手动配置 URL

## 鉴权与撤销

- “连接 Bilibili”功能依赖 PineSnap 登录态（Supabase session cookie）访问连接页与安装端点。
- 安装端点在生成新授权前 SHOULD 撤销旧授权（同用户同平台），以降低泄露面与避免累积过多 token。
- 撤销后 MUST 使跨站采集请求立即失效。

## 扩展性

- 授权模型使用 `scopes` 表达平台能力，例如：
  - `capture:bilibili`
  - 未来可扩展 `capture:youtube` 等
- 连接页与安装端点应按平台拆分（`/connect/<platform>`），而授权/校验逻辑保持通用。

