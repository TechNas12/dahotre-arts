import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
  name: string;
  role: string;
};

export default function DashboardLayout({ children, name, role }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar name={name} role={role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
