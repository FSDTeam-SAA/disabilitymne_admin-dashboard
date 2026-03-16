"use client";

import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { toast } from "sonner";
import { useEffect } from "react";
import { Users, UserCheck, UserPlus, Star, DollarSign, Ban } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageTitle } from "@/components/shared/page-title";
import { Pagination } from "@/components/shared/pagination";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { getDashboardOverview, getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const cardConfigs = [
  { label: "Total User", key: "totalUsers", color: "from-[#4a1231] to-[#7c1b3d]", icon: Users, iconColor: "text-red-500" },
  { label: "Total Monthly User", key: "totalMonthlyUsers", color: "from-[#0d335d] to-[#14539a]", icon: UserCheck, iconColor: "text-blue-500" },
  { label: "Total Six Month User", key: "totalSixMonthUsers", color: "from-[#4c481a] to-[#7a721c]", icon: UserPlus, iconColor: "text-yellow-500" },
  { label: "Total Premium user", key: "totalPremiumUsers", color: "from-[#124231] to-[#1c6e4e]", icon: Star, iconColor: "text-green-500" },
  { label: "Total Revenue", key: "totalRevenueDisplay", color: "from-[#4a3412] to-[#7c561b]", icon: DollarSign, iconColor: "text-orange-500" },
];

const pieColors = ["#3dcc5f", "#1890ff", "#ff1d58", "#ff9f31"];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: getDashboardOverview,
  });

  useEffect(() => {
    if (error) toast.error(getErrorMessage(error));
  }, [error]);

  if (isLoading) return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" breadcrumb="Welcome back to your admin panel" />
      <TableSkeleton rows={6} />
    </div>
  );

  if (!data) return <EmptyState title="No data" description="Analytics unavailable." />;

  return (
    <div className="space-y-6 pb-8">
      <PageTitle title="Dashboard" breadcrumb="Welcome back to your admin panel" />

      {/* Stats Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cardConfigs.map((config) => {
          const Icon = config.icon;
          return (
            <div
              key={config.label}
              className={cn(
                "relative overflow-hidden rounded-xl bg-gradient-to-br p-5 shadow-lg border border-white/5",
                config.color
              )}
            >
              <div className="relative z-10">
                <p className="text-2xl font-bold text-white">
                  {config.key === "totalRevenueDisplay" ? data.totals.totalRevenueDisplay : data.totals[config.key as keyof typeof data.totals]}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-300">{config.label}</p>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2">
                <Icon className={cn("size-5", config.iconColor)} />
              </div>
            </div>
          );
        })}
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border-white/10 bg-[#111c31]/50 backdrop-blur-md xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Earnings Overview</CardTitle>
              <CardDescription className="text-slate-400">Track total revenue and platform payouts.</CardDescription>
            </div>
            <select className="bg-white/5 border border-white/10 text-xs text-white rounded px-2 py-1">
              <option>Monthly</option>
            </select>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.earningsSeries}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d8f2ff" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#d8f2ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                   contentStyle={{ background: "#1a3154", border: "1px solid #334155", borderRadius: "8px" }}
                   itemStyle={{ color: "#fff" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#72B4E6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#111c31]/50 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
             <CardTitle className="text-white text-base">Survey for Subscription</CardTitle>
             <select className="bg-white/5 border border-white/10 text-[10px] text-white rounded px-1">
              <option>Monthly</option>
            </select>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.subscriptionSurvey}
                  dataKey="percentage"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                >
                  {data.subscriptionSurvey.map((_, index) => (
                    <Cell key={index} fill={pieColors[index % pieColors.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                {data.subscriptionSurvey.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="size-2 rounded-full" style={{ backgroundColor: pieColors[i] }} />
                        <span className="text-slate-300">{item.label} {item.percentage}%</span>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent User Table */}
      <Card className="border-white/10 bg-[#111c31]/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-white">Recent User</CardTitle>
          <CardDescription className="text-slate-400 text-xs">See your most recent signups</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-300">User Name</TableHead>
                  <TableHead className="text-slate-300">Phone</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Date</TableHead>
                  <TableHead className="text-slate-300">Subscription</TableHead>
                  <TableHead className="text-slate-300">Mobility</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/10 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium text-slate-200">{user.name}</TableCell>
                    <TableCell className="text-slate-400">{user.phone || "-"}</TableCell>
                    <TableCell className="text-slate-400">{user.email}</TableCell>
                    <TableCell className="text-slate-400">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                       <Badge className="bg-orange-500/20 text-orange-400 border-none hover:bg-orange-500/30">
                        {user.subscription}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{user.mobilityType || "-"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                           "bg-transparent border",
                           user.status === "active" ? "text-green-500 border-green-500/50" : 
                           user.status === "suspended" ? "text-red-500 border-red-500/50" : 
                           "text-orange-500 border-orange-500/50"
                        )}
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <button className="text-red-500 hover:text-red-400">
                            <Ban className="size-4" />
                        </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
             <span>Showing 1 to {data.recentUsers.length} of {data.totals.totalUsers} results</span>
             <Pagination page={1} totalPages={2} onPageChange={() => {}} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}