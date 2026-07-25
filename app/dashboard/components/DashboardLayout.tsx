"use client";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

type DashboardLayoutProps = {
  children: ReactNode;
  name: string;
  role: string;
};

export default function DashboardLayout({ children, name, role }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex relative">
      {/* Sidebar Navigation */}
      <Sidebar 
        name={name} 
        role={role} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
