"use client";

import { useState } from "react";
import DashboardSidebar from "./DashboardSidebar";
import DashboardTopbar from "./DashboardTopbar";
import type { DashboardUser } from "./types";

type Props = {
  user: DashboardUser;
  unreadNotifications: number;
  children: React.ReactNode;
};

/**
 * Client island for the workspace chrome (sidebar + topbar + their open/collapse
 * state). Page content is passed in as server-rendered children.
 */
export default function DashboardShell({ user, unreadNotifications, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-base text-ink">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-20%,rgba(56,189,248,0.16),transparent_65%)]"
      />

      <DashboardSidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar
          user={user}
          unreadNotifications={unreadNotifications}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
