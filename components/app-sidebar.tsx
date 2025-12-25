"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Plus } from "lucide-react"

import { SidebarHistory } from "@/components/sidebar/sidebar-history"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <Link
              className="flex flex-row items-center gap-3"
              href="/chat"
              onClick={() => {
                setOpenMobile(false)
              }}
            >
              <span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
                Chat
              </span>
            </Link>

            <div className="flex flex-row items-center gap-1">
              <Button
                className="h-8 p-1 md:h-fit md:p-2"
                onClick={() => {
                  setOpenMobile(false)
                  router.push("/chat")
                  router.refresh()
                }}
                type="button"
                variant="ghost"
              >
                <Plus className="size-4" />
                <span className="sr-only">New Chat</span>
              </Button>
            </div>
          </div>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarHistory
          onSearchQueryChange={setSearchQuery}
          searchQuery={searchQuery}
        />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}




