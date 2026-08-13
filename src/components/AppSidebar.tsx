"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Database,
  Download,
  History,
  LogOut,
  PanelLeftIcon,
  Table2,
  TerminalSquare,
  Trash2,
  Upload,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  {
    href: "/namespaces",
    label: "Namespaces",
    icon: Database,
  },
  {
    href: "/upload",
    label: "Upload",
    icon: Upload,
  },
  {
    href: "/query",
    label: "Query",
    icon: TerminalSquare,
  },
  {
    href: "/datasets",
    label: "Datasets",
    icon: Table2,
  },
  {
    href: "/rollback",
    label: "Rollback",
    icon: History,
  },
  {
    href: "/download",
    label: "Download",
    icon: Download,
  },
  {
    href: "/delete",
    label: "Delete",
    icon: Trash2,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const { session, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
            DL
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm leading-none font-semibold">Data Lake</p>
            <p className="text-xs text-muted-foreground">Control Center</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {session ? (
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<SidebarMenuButton size="lg" tooltip={session.username} />}
                >
                  <Avatar size="sm">
                    <AvatarFallback>{session.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm leading-tight font-medium">
                      {session.username}
                    </span>
                    {session.email ? (
                      <span className="truncate text-xs text-sidebar-foreground/70">
                        {session.email}
                      </span>
                    ) : null}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="top" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>
                      <div className="flex flex-col gap-0.5">
                        <span>{session.username}</span>
                        {session.email ? (
                          <span className="font-normal text-muted-foreground">
                            {session.email}
                          </span>
                        ) : null}
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={logout}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ) : null}

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleSidebar}
              tooltip={state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeftIcon />
              <span>{state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
