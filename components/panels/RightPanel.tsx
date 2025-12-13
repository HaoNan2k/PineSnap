const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
      </div>
      <div className="px-4 py-3 text-sm text-fg-muted">{children}</div>
    </section>
  );
};

export const RightPanel = () => {
  return (
    <div className="h-full w-[360px] bg-bg text-fg">
      <div className="h-full p-4 space-y-4 overflow-y-auto">
        <div className="pb-2">
          <div className="text-xs uppercase tracking-wider text-fg-faint">
            SocraticU
          </div>
          <div className="text-base font-semibold text-fg mt-1">学习面板</div>
        </div>

        <Section title="Session Goal">
          设定本次对话的学习目标。后续会支持本地保存与快捷编辑。
        </Section>

        <Section title="Guidance">
          这里展示下一步提问策略与建议（保持简短、可执行）。
        </Section>

        <Section title="Summary">
          默认手动触发总结，避免自动打扰。后续可增加“生成总结”按钮。
        </Section>

        <Section title="Checklist">
          用清单拆解学习步骤（后续支持勾选并本地持久化）。
        </Section>
      </div>
    </div>
  );
};