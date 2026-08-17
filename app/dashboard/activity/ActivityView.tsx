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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
          <Activity className="w-5 h-5 text-[#F5F5F5]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Activity Log</h1>
          <p className="text-sm text-[#A3A3A3]">Track and monitor all administrative actions across the platform.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Actions", value: initialStats.totalActions, icon: Activity, color: "text-blue-400" },
          { label: "Today's Actions", value: initialStats.todayActions, icon: TrendingUp, color: "text-orange-400" },
          { label: "This Week", value: initialStats.thisWeekActions, icon: Calendar, color: "text-amber-400" },
          { label: "Active Users (30d)", value: initialStats.activeUsers, icon: Users, color: "text-purple-400" }
        ].map((kpi, i) => (
          <div key={i} className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-5 flex items-center gap-4 shadow-sm animate-[fadeInUp_0.5s_ease-out_forwards]">
            <div className={`w-12 h-12 rounded-full bg-[#0A0A0A] flex items-center justify-center ${kpi.color}`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#F5F5F5] tracking-tight">{kpi.value.toLocaleString()}</div>
              <div className="text-sm font-medium text-[#A3A3A3]">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeInUp_0.6s_ease-out_forwards]">
        
        {/* Trend Area Chart */}
        <div className="lg:col-span-2 bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#F5F5F5] mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#A3A3A3]" />
            Activity Over Time (Last 14 Days)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown Donut Chart */}
        <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-bold text-[#F5F5F5] mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#A3A3A3]" />
            Action Breakdown
          </h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
             {typeBreakdown.slice(0, 6).map((item, i) => (
               <div key={item.name} className="flex items-center gap-1.5 text-xs font-medium text-[#F5F5F5]">
                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                 {item.name}
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* User Drilldown Section */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl p-6 animate-[fadeInUp_0.7s_ease-out_forwards]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#A3A3A3]" />
            User Activity Drilldown
          </h3>
          <div className="relative w-full sm:w-64">
            <select 
              className="w-full appearance-none bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-4 py-2 pr-10 text-sm text-[#F5F5F5] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
              value={selectedUserId || ""}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select a user...</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none" />
          </div>
        </div>

        {selectedUserId ? (
          isLoadingUser ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : userSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Orders Created", value: userSummary.ordersCreated, icon: ShoppingBag, color: "text-blue-400" },
                  { label: "Products Added", value: userSummary.productsAdded, icon: Package, color: "text-emerald-400" },
                  { label: "Customers Added", value: userSummary.customersAdded, icon: UserPlus, color: "text-amber-400" },
                  { label: "Expenses Added", value: userSummary.expensesAdded, icon: Receipt, color: "text-pink-400" },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#0A0A0A]/50 border border-[#1F1F1F] rounded-xl p-4 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-2">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                     </div>
                     <div className="text-2xl font-bold text-[#F5F5F5]">{stat.value}</div>
                     <div className="text-xs font-medium text-[#737373]">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#0A0A0A]/50 border border-[#1F1F1F] rounded-xl p-4">
                 <h4 className="text-sm font-bold text-[#F5F5F5] mb-4">Activity (Last 7 Days)</h4>
                 <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userSummary.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="date" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
                          cursor={{ fill: '#1e293b' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-[#737373] py-8">Failed to load user summary.</div>
          )
        ) : (
          <div className="h-40 border-2 border-dashed border-[#1F1F1F] rounded-xl flex items-center justify-center text-[#737373]">
            Select a user above to view their breakdown.
          </div>
        )}
      </div>

      {/* Raw Activity Table (Collapsible) */}
      <div className="bg-[#111111] border border-[#1F1F1F] rounded-2xl overflow-hidden animate-[fadeInUp_0.8s_ease-out_forwards]">
        <div 
          className="p-6 flex items-center justify-between cursor-pointer hover:bg-[#1A1A1A]/30 transition-colors"
          onClick={() => setIsTableOpen(!isTableOpen)}
        >
          <h3 className="text-lg font-bold text-[#F5F5F5] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#A3A3A3]" />
            Raw Activity Logs
          </h3>
          <ChevronRight className={`w-5 h-5 text-[#737373] transition-transform duration-300 ${isTableOpen ? 'rotate-90' : ''}`} />
        </div>

        {isTableOpen && (
          <div className="border-t border-[#1F1F1F]">
            <div className="p-4 bg-[#111111]/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#1F1F1F]">
               <div className="relative w-full sm:w-96">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                 <input 
                   type="text" 
                   placeholder="Search logs by detail..."
                   className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-[#F5F5F5] focus:outline-none focus:border-slate-500"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
               </div>
               <div className="text-sm font-medium text-[#A3A3A3]">
                 {totalLogs} records found
               </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-[#0A0A0A]/50">
                  <tr className="border-b border-[#1F1F1F] text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider">
                    <th className="p-4">Time</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {isLoadingLogs ? (
                     <tr>
                        <td colSpan={4} className="p-8 text-center text-[#737373]">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-500 mx-auto mb-2"></div>
                          Loading logs...
                        </td>
                     </tr>
                  ) : logs.length === 0 ? (
                     <tr>
                        <td colSpan={4} className="p-8 text-center text-[#737373]">No logs found.</td>
                     </tr>
                  ) : (
                    logs.map(log => {
                      const date = new Date(log.created_at);
                      return (
                        <tr key={log.id} className="hover:bg-[#1A1A1A]/30 transition-colors">
                          <td className="p-4">
                            <div className="text-sm text-[#F5F5F5]">{date.toLocaleDateString()}</div>
                            <div className="text-xs text-[#737373]">{date.toLocaleTimeString()}</div>
                          </td>
                          <td className="p-4">
                            <span className="bg-[#1A1A1A] text-[#F5F5F5] px-2 py-0.5 rounded text-xs font-medium">
                              {log.user?.name || `User ID ${log.user_id}`}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <span className="text-sm font-bold text-[#F5F5F5]">{log.action}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-[#A3A3A3]">{log.details}</div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalLogs > pageSize && (
              <div className="p-4 flex items-center justify-between border-t border-[#1F1F1F]">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#F5F5F5] rounded text-sm disabled:opacity-50 hover:bg-[#2A2A2A] transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-[#A3A3A3]">Page {page} of {Math.ceil(totalLogs / pageSize)}</span>
                <button 
                  onClick={() => setPage(p => Math.min(Math.ceil(totalLogs / pageSize), p + 1))}
                  disabled={page >= Math.ceil(totalLogs / pageSize)}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#F5F5F5] rounded text-sm disabled:opacity-50 hover:bg-[#2A2A2A] transition-colors"
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


