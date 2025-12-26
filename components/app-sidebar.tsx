"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Hash,
  Home,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter, usePathname, useParams } from "next/navigation";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const profile = useQuery(api.classes.getViewerProfile);
  const classes = useQuery(api.classes.listMyClasses) ?? [];
  const crns = useQuery(api.classes.listMyCRNs) ?? [];
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = profile?.role === "admin";

 

  const adminCRNs = crns.filter(
    (c) => c.role === "professor" || c.role === "ta"
  );
  const studentCRNs = crns.filter(
    (c) => c.role === "student" || c.role === "ta"
  );

  // Base navigation items for all users
  const navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: pathname === "/dashboard",
    },
  ];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <GraduationCap className="size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navItems} />

        {/* My Classes */}
        {isAdmin && classes.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>My Classes</SidebarGroupLabel>
            <SidebarMenu>
              {classes.map((klass) => (
                <SidebarMenuItem key={klass.classId}>
                  <SidebarMenuButton
                    isActive={pathname.includes(klass.classId)}
                    className="flex flex-row items-center gap-2"
                    onClick={() => router.push(`/classes/${klass.classId}`)}
                  >
                    <BookOpen />
                    <span>{klass.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Admin Section: Active CRNs (Management) */}
        {isAdmin && adminCRNs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Active CRNs</SidebarGroupLabel>
            <SidebarMenu>
              {adminCRNs.slice(0, 5).map((crn) => (
                <SidebarMenuItem key={crn.crnId}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(`/crns/${crn.crnId}`)}
                  >
                    <Link href={`/crns/${crn.crnId}`}>
                      <div className="flex flex-col gap-0.5 leading-none text-left">
                        <span className="font-medium">{crn.className}</span>
                        <span className="text-xs text-muted-foreground">
                          {crn.semester} {crn.year} (Staff)
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {adminCRNs.length > 5 && (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Link
                      href="/dashboard"
                      className="text-xs text-muted-foreground italic px-2"
                    >
                      +{adminCRNs.length - 5} more in dashboard
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Student Section: Enrolled Classes */}
        {!isAdmin && studentCRNs.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Enrolled Classes</SidebarGroupLabel>
            <SidebarMenu>
              {studentCRNs.slice(0, 5).map((crn) => (
                <SidebarMenuItem key={crn.crnId}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(`/${crn.crnId}`)}
                  >
                    <Link href={`/${crn.crnId}`}>
                      <div className="flex flex-col gap-0.5 leading-none text-left">
                        <span className="font-medium">{crn.className}</span>
                        <span className="text-xs text-muted-foreground">
                          {crn.semester} {crn.year}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {studentCRNs.length > 5 && (
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Link
                      href="/dashboard"
                      className="text-xs text-muted-foreground italic px-2"
                    >
                      +{studentCRNs.length - 5} more in dashboard
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <User className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {profile?.name ?? "User"}
                  </span>
                  <span className="truncate text-xs">{profile?.email}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2">
                  <User className="size-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Settings className="size-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => {
                    void signOut()
                      .then(() => {
                        router.push("/signin");
                      })
                      .catch((error) => {
                        console.error("Sign out failed:", error);
                      });
                  }}
                >
                  <LogOut className="size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
