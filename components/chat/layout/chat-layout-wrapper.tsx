"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function ChatLayoutWrapper({
  children,
  defaultSidebarOpen,
}: {
  children: React.ReactNode;
  defaultSidebarOpen: boolean;
}) {
  return (
    <DataStreamProvider>
      <DataStreamHandler />
      <SidebarProvider defaultOpen={defaultSidebarOpen}>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-svh w-full min-w-0 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DataStreamProvider>
  );
}
