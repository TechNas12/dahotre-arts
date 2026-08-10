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
    <div className="h-screen bg-[#0A0A0A] text-[#F5F5F5] flex overflow-hidden">
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
        
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A] custom-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

