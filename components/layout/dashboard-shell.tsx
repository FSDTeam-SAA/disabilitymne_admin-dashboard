"use client";

import { useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen w-full bg-[#020816] text-slate-100">
      {/* Desktop Sidebar */}
      <AppSidebar />

      {/* Mobile Sidebar Overlay */}
      <AppSidebar 
        mobile 
        open={mobileOpen} 
        onClose={() => setMobileOpen(false)} 
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
        <AppHeader onMenuOpen={() => setMobileOpen(true)} />
        
        <main className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8">
          {/* Background Layer */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_35%,rgba(63,101,151,.35),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(97,132,186,.24),transparent_40%),linear-gradient(130deg,#152947_0%,#1b3157_43%,#192f54_100%)]" />
          
          {/* Content Wrapper */}
          <div className="">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}