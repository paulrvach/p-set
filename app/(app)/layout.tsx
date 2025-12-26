"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { HeaderProvider, HeaderSlot } from "@/components/header-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <HeaderProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 " />
            <div className="flex flex-1 items-center justify-between gap-2">
              <HeaderSlot />
            </div>
          </header>
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HeaderProvider>
  );
}
