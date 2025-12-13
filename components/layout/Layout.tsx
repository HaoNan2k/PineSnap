import type { ReactNode } from "react";
import { PanelLeftOpen } from "lucide-react";

interface LayoutProps {
  sidebar: ReactNode;
  chatArea: ReactNode;
  rightPanel: ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

const Layout = ({
  sidebar,
  chatArea,
  rightPanel,
  isSidebarOpen,
  onToggleSidebar,
}: LayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden relative text-fg">
      {/* 左侧栏 - 动态宽度 */}
      <aside
        className={`flex-shrink-0 bg-bg border-r border-border transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full border-none"
        }`}
      >
        <div className="w-72 h-full">{sidebar}</div>
      </aside>

      {/* 中间聊天区 - 自动占据剩余空间 */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface relative">
        {/* 当侧边栏关闭时显示打开按钮 */}
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="absolute top-4 left-4 p-2 text-fg-muted bg-surface border border-border rounded-md shadow-sm z-10 hover:bg-surface-2 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            title="Open Sidebar"
            aria-label="Open Sidebar"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}
        {chatArea}
      </main>

      {/* 右侧栏 - 固定宽度，不收缩 */}
      <aside className="flex-shrink-0 border-l border-border bg-bg">
        {rightPanel}
      </aside>
    </div>
  );
};

export default Layout;
