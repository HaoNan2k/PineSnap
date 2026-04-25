export default function DebugIndexPage() {
  return (
    <div className="px-6 py-12 max-w-3xl mx-auto">
      <h1 className="font-mono text-2xl font-semibold mb-2">PineSnap Debug</h1>
      <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mb-8">
        开发者向内部追踪平台。在顶栏搜索框输入 learningId 或邮箱定位会话。
      </p>

      <section className="font-mono text-sm space-y-4">
        <div>
          <h2 className="font-semibold mb-1">支持的查询</h2>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
            <li>
              <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">UUID</code>{" "}
              → 直接跳到 learning 详情
            </li>
            <li>
              邮箱（含 @）→ 列出该用户所有 learning
            </li>
          </ul>
        </div>

        <div className="text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-800">
          Phase 0：纯 DB 读取，每条 message 卡片右上角的{" "}
          <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
            Trace ↗
          </code>{" "}
          预留按钮在 Phase 1 接入观测平台后启用。
        </div>
      </section>
    </div>
  );
}
