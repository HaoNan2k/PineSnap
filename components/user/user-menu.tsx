"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogIn, Settings, HelpCircle, User as UserIcon, Link2, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type UserMenuVariant = "icon" | "sidebar";

type UserMenuProps = {
  variant?: UserMenuVariant;
  loginHref?: string;
  className?: string;
};

export function UserMenu({
  variant = "icon",
  loginHref = "/chat",
  className,
}: UserMenuProps) {
  const { user } = useAuth();

  const email = user?.email ?? "";
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (email ? email.split("@")[0] : "访客用户");
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initial = displayName?.[0]?.toUpperCase() || "U";
  const isGuest = !user;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar" ? (
          <button
            type="button"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border border-transparent px-2 py-3 transition-all outline-none",
              "hover:bg-sand/10 hover:shadow-sm hover:border-sand/40",
              isGuest && "text-forest-muted",
              className
            )}
            aria-label="用户菜单"
          >
            <Avatar className="h-9 w-9 border border-sand/30 bg-sand/10">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={email} /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col text-left">
              <span className="truncate text-sm font-semibold text-text-main">
                {displayName || "访客用户"}
              </span>
              <span className="truncate text-xs text-forest-muted">
                {isGuest ? "点击登录" : email || "PineSnap 用户"}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 text-forest-muted/50" />
          </button>
        ) : (
          <Button variant="ghost" className={cn("relative h-8 w-8 rounded-full", className)}>
            <Avatar className="h-8 w-8">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={email} /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align={variant === "sidebar" ? "start" : "end"}
        forceMount
      >
        {user ? (
          <>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm truncate">{displayName}</p>
                {email ? (
                  <p className="text-xs text-muted-foreground truncate">{email}</p>
                ) : null}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>个人资料</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Settings className="mr-2 h-4 w-4" />
              <span>设置</span>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>帮助</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/connect/extension" className="cursor-pointer">
                <Link2 className="mr-2 h-4 w-4" />
                <span>连接扩展</span>
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild>
            <Link href={loginHref} className="cursor-pointer">
              <LogIn className="mr-2 h-4 w-4" />
              <span>登录</span>
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

