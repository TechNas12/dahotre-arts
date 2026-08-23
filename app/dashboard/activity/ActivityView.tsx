"use client";

import { useState, useEffect } from "react";
import { 
  ActivityLog, 
  getUserActivitySummary, 
  listActivityLogs 
} from "@/app/actions/activity";
import { 
  Activity, 
  TrendingUp, 
  Calendar, 
  Users,
  ChevronDown,
  Search,
  ChevronRight,
  Package,
  ShoppingBag,
  UserPlus,
  Receipt
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';

type Props = {
  initialStats: { totalActions: number, todayActions: number, thisWeekActions: number, activeUsers: number };
  typeBreakdown: { name: string; value: number }[];
  activityOverTime: { date: string; count: number }[];
  allUsers: { id: number; name: string; email: string }[];
};

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function ActivityView({ initialStats, typeBreakdown, activityOverTime, allUsers }: Props) {
  // User Drilldown State
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSummary, setUserSummary] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  // Raw Table State
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 20;

  useEffect(() => {
    if (selectedUserId) {
      setIsLoadingUser(true);
      getUserActivitySummary(selectedUserId).then(data => {
        setUserSummary(data);
        setIsLoadingUser(false);
      });
    } else {
      setUserSummary(null);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (isTableOpen) {
      fetchLogs();
    }
  }, [isTableOpen, page, searchQuery]);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    const filters = { search: searchQuery };
    const { data, total } = await listActivityLogs(page, pageSize, filters);
    setLogs(data);
    setTotalLogs(total);
    setIsLoadingLogs(false);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('ORDER')) return <ShoppingBag className="w-4 h-4" />;
    if (action.includes('PRODUCT')) return <Package className="w-4 h-4" />;
    if (action.includes('CUSTOMER')) return <UserPlus className="w-4 h-4" />;
    if (action.includes('EXPENSE')) return <Receipt className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-28">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#18181C] border border-[#222227] flex items-center justify-center">
          <Activity className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#FAFAFA] tracking-tight">Activity Log</h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA]">Track and monitor all administrative actions across the platform.</p>
        </div>
      </div>

      {/* Responsive KPI Grid: 2-column on mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {[
          { label: "Total Actions", value: initialStats.totalActions, icon: Activity, color: "text-blue-400" },
          { label: "Today's Actions", value: initialStats.todayActions, icon: TrendingUp, color: "text-orange-400" },
          { label: "This Week", value: initialStats.thisWeekActions, icon: Calendar, color: "text-amber-400" },
          { label: "Active Users (30d)", value: initialStats.activeUsers, icon: Users, color: "text-purple-400" }
        ].map((kpi, i) => (
          <div key={i} className="bg-[#121215] border border-[#1F1F1F] rounded-xl sm:rounded-2xl p-3 sm:p-5 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-[#18181C] flex items-center justify-center shrink-0 ${kpi.color}`}>
              <kpi.icon className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-2xl font-bold text-[#FAFAFA] tracking-tight truncate">{kpi.value.toLocaleString()}</div>
              <div className="text-[11px] sm:text-sm font-medium text-[#71717A] truncate">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#121215] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-bold text-[#FAFAFA] mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            Activity Over Time (Last 14 Days)
          </h3>
          <div className="h-56 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityOverTime} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717A" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181C', borderColor: '#222227', borderRadius: '0.75rem', color: '#FAFAFA' }}
                  itemStyle={{ color: '#F97316' }}
                />
                <Area type="monotone" dataKey="count" stroke="#F97316" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Donut Chart */}
        <div className="bg-[#121215] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6 flex flex-col">
          <h3 className="text-sm sm:text-base font-bold text-[#FAFAFA] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            Action Breakdown
          </h3>
          <div className="flex-1 min-h-[200px] sm:min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181C', borderColor: '#222227', borderRadius: '0.75rem', color: '#FAFAFA' }}
                  itemStyle={{ color: '#FAFAFA' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
             {typeBreakdown.slice(0, 6).map((item, i) => (
               <div key={item.name} className="flex items-center gap-1.5 text-xs font-medium text-[#FAFAFA]">
                 <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                 <span className="truncate max-w-[120px]">{item.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* User Drilldown Section */}
      <div className="bg-[#121215] border border-[#1F1F1F] rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h3 className="text-sm sm:text-base font-bold text-[#FAFAFA] flex items-center gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            User Activity Drilldown
          </h3>
          <div className="relative w-full sm:w-64">
            <select 
              className="w-full appearance-none bg-[#18181C] border border-[#222227] rounded-xl px-3.5 py-2 pr-10 text-xs sm:text-sm text-[#FAFAFA] focus:outline-none focus:border-orange-500 transition-all cursor-pointer"
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select a user...</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] pointer-events-none" />
          </div>
        </div>

        {selectedUserId ? (
          isLoadingUser ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : userSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {[
                  { label: "Orders Created", value: userSummary.ordersCreated, icon: ShoppingBag, color: "text-blue-400" },
                  { label: "Products Added", value: userSummary.productsAdded, icon: Package, color: "text-emerald-400" },
                  { label: "Customers Added", value: userSummary.customersAdded, icon: UserPlus, color: "text-amber-400" },
                  { label: "Expenses Added", value: userSummary.expensesAdded, icon: Receipt, color: "text-pink-400" },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#18181C] border border-[#222227] rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-1.5">
                        <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                     </div>
                     <div className="text-xl sm:text-2xl font-bold text-[#FAFAFA]">{stat.value}</div>
                     <div className="text-[11px] sm:text-xs font-medium text-[#71717A]">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#18181C] border border-[#222227] rounded-xl p-3 sm:p-4">
                 <h4 className="text-xs sm:text-sm font-bold text-[#FAFAFA] mb-3">Activity (Last 7 Days)</h4>
                 <div className="h-28 sm:h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userSummary.chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717A" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717A" fontSize={10} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#121215', borderColor: '#222227', borderRadius: '0.5rem', color: '#FAFAFA' }}
                          cursor={{ fill: '#1e293b' }}
                        />
                        <Bar dataKey="count" fill="#F97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-[#71717A] py-8 text-xs">Failed to load user summary.</div>
          )
        ) : (
          <div className="h-32 border-2 border-dashed border-[#222227] rounded-xl flex items-center justify-center text-xs text-[#71717A]">
            Select a user above to view their breakdown.
          </div>
        )}
      </div>

      {/* Raw Activity Table (Collapsible) */}
      <div className="bg-[#121215] border border-[#1F1F1F] rounded-2xl overflow-hidden">
        <div 
          className="p-4 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-[#18181C] transition-colors"
          onClick={() => setIsTableOpen(!isTableOpen)}
        >
          <h3 className="text-sm sm:text-base font-bold text-[#FAFAFA] flex items-center gap-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            Raw Activity Logs
          </h3>
          <ChevronRight className={`w-4 h-4 text-[#71717A] transition-transform duration-300 ${isTableOpen ? 'rotate-90 text-orange-400' : ''}`} />
        </div>

        {isTableOpen && (
          <div className="border-t border-[#1F1F1F]">
            <div className="p-3 sm:p-4 bg-[#0E0E11] flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#1F1F1F]">
               <div className="relative w-full sm:w-96">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
                 <input 
                   type="text" 
                   placeholder="Search logs by detail..."
                   className="w-full pl-9 pr-4 py-1.5 bg-[#18181C] border border-[#222227] rounded-xl text-xs sm:text-sm text-[#FAFAFA] focus:outline-none focus:border-orange-500"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
               </div>
               <div className="text-xs font-medium text-[#71717A]">
                 {totalLogs} records found
               </div>
            </div>

            {/* Mobile View: Activity Cards */}
            <div className="block md:hidden divide-y divide-[#1F1F1F]/60">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-[#71717A]">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  Loading logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="p-8 text-center text-[#71717A] text-xs">No logs found.</div>
              ) : (
                logs.map(log => {
                  const date = new Date(log.created_at);
                  return (
                    <div key={log.id} className="p-3.5 space-y-1.5 hover:bg-[#16161A]">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {getActionIcon(log.action)}
                          <span className="font-bold text-[#FAFAFA]">{log.action}</span>
                        </div>
                        <span className="text-[11px] font-mono text-[#71717A]">
                          {date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} · {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-xs text-[#A1A1AA]">
                        {log.details}
                      </div>
                      <div className="text-[11px] text-[#71717A]">
                        By: <strong className="text-[#FAFAFA]">{log.user?.name || `User #${log.user_id}`}</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop View: Data Table */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#0A0A0A]/50">
                  <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                    <th className="p-4">Time</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {isLoadingLogs ? (
                     <tr>
                        <td colSpan={4} className="p-8 text-center text-[#71717A]">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
                          Loading logs...
                        </td>
                     </tr>
                  ) : logs.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="p-8 text-center text-[#71717A]">No logs found.</td>
                     </tr>
                  ) : (
                    logs.map(log => {
                      const date = new Date(log.created_at);
                      return (
                        <tr key={log.id} className="hover:bg-[#18181C] transition-colors text-xs">
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-medium text-[#FAFAFA]">{date.toLocaleDateString()}</div>
                            <div className="text-[11px] text-[#71717A]">{date.toLocaleTimeString()}</div>
                          </td>
                          <td className="p-4">
                            <span className="bg-[#18181C] text-[#FAFAFA] border border-[#222227] px-2.5 py-1 rounded-md font-medium">
                              {log.user?.name || `User ID ${log.user_id}`}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="font-bold text-[#FAFAFA]">{log.action}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-[#A1A1AA]">{log.details}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalLogs > pageSize && (
              <div className="p-3 sm:p-4 flex items-center justify-between border-t border-[#1F1F1F]">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-[#18181C] border border-[#222227] text-[#FAFAFA] rounded-lg text-xs disabled:opacity-50 hover:bg-[#222227] transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs text-[#71717A]">Page {page} of {Math.ceil(totalLogs / pageSize)}</span>
                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(totalLogs / pageSize), p + 1))}
                  disabled={page >= Math.ceil(totalLogs / pageSize)}
                  className="px-3 py-1.5 bg-[#18181C] border border-[#222227] text-[#FAFAFA] rounded-lg text-xs disabled:opacity-50 hover:bg-[#222227] transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}


