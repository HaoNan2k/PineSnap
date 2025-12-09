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
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden relative">
      {/* 左侧栏 - 动态宽度 */}
      <aside
        className={`flex-shrink-0 bg-gray-50 border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full border-none"
        }`}
      >
        <div className="w-64 h-full">{sidebar}</div>
      </aside>

      {/* 中间聊天区 - 自动占据剩余空间 */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* 当侧边栏关闭时显示打开按钮 */}
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="absolute top-4 left-4 p-2 text-gray-500 bg-white border border-gray-200 rounded-md shadow-sm z-10 hover:bg-gray-50 transition-colors"
            title="Open Sidebar"
          >
            <PanelLeftOpen size={20} />
          </button>
        )}
        {chatArea}
      </main>

      {/* 右侧栏 - 固定宽度，不收缩 */}
      <aside className="flex-shrink-0 border-l border-gray-200 bg-gray-50">
        {rightPanel}
      </aside>
    </div>
  );
};

export default Layout;
