import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Users, Activity, Download } from 'lucide-react';

// Mock data
const revenueData = [
  { date: 'Week 1', revenue: 15000, grafts: 2800, surgeries: 3 },
  { date: 'Week 2', revenue: 22000, grafts: 4200, surgeries: 5 },
  { date: 'Week 3', revenue: 18000, grafts: 3400, surgeries: 4 },
  { date: 'Week 4', revenue: 25000, grafts: 4800, surgeries: 6 },
];

const conversionFunnelData = [
  { stage: 'Leads', count: 120, color: '#3b82f6' },
  { stage: 'Consults', count: 85, color: '#8b5cf6' },
  { stage: 'Quoted', count: 62, color: '#22c55e' },
  { stage: 'Booked', count: 41, color: '#f97316' },
];

const leadSourceData = [
  { name: 'Google Ads', value: 42 },
  { name: 'Referral', value: 31 },
  { name: 'Website', value: 18 },
  { name: 'Social Media', value: 9 },
];

const doctorPerformance = [
  { name: 'Dr. Smith', surgeries: 18, grafts: 51000, satisfaction: 4.8 },
  { name: 'Dr. Johnson', surgeries: 15, grafts: 42500, satisfaction: 4.9 },
  { name: 'Dr. Williams', surgeries: 12, grafts: 34000, satisfaction: 4.7 },
];

const COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ef4444'];

export default function AnalyticsPage() {
  const { role } = useAuth();
  const [dateRange, setDateRange] = useState('30');
  const isOwner = role === 'OWNER' || role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8 space-y-8">
      {/* Header */}
      <div className="glass p-6 rounded-xl border border-border flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {isOwner ? 'Comprehensive clinic insights' : 'Your performance metrics'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px] glass-card">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {isOwner ? <OwnerAnalytics /> : <DoctorAnalytics />}
    </div>
  );
}

function OwnerAnalytics() {
  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value="$80,000"
          change="+18.2%"
          icon={DollarSign}
          trend="up"
        />
        <KPICard
          title="Total Surgeries"
          value="18"
          change="+3"
          icon={Activity}
          trend="up"
        />
        <KPICard
          title="New Patients"
          value="45"
          change="+12"
          icon={Users}
          trend="up"
        />
        <KPICard
          title="Conversion Rate"
          value="34.2%"
          change="+5.1%"
          icon={TrendingUp}
          trend="up"
        />
      </div>

      {/* Main Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Revenue & Surgeries</CardTitle>
            <CardDescription>Weekly performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Lead to surgery journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conversionFunnelData.map((stage, idx) => {
                const percentage = idx === 0 ? 100 : (stage.count / conversionFunnelData[0].count) * 100;
                return (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-muted-foreground">{stage.count}</span>
                    </div>
                    <div className="relative h-12 rounded-lg overflow-hidden bg-muted/20">
                      <div
                        className="absolute inset-y-0 left-0 flex items-center justify-center text-white font-semibold transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: stage.color,
                        }}
                      >
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Sources */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Patient acquisition breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourceData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Doctor Performance */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Doctor Performance</CardTitle>
            <CardDescription>Surgery and graft metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={doctorPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="surgeries" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DoctorAnalytics() {
  return (
    <>
      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="My Surgeries"
          value="18"
          change="+3"
          icon={Activity}
          trend="up"
        />
        <KPICard
          title="Total Grafts"
          value="51,000"
          change="+8,500"
          icon={TrendingUp}
          trend="up"
        />
        <KPICard
          title="My Patients"
          value="42"
          change="+5"
          icon={Users}
          trend="up"
        />
        <KPICard
          title="Avg. Satisfaction"
          value="4.8/5"
          change="+0.2"
          icon={Activity}
          trend="up"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Performance */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>My Surgery Trend</CardTitle>
            <CardDescription>Weekly surgeries completed</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="surgeries" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafts */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Grafts Placed</CardTitle>
            <CardDescription>Weekly breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="grafts" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Clinic Aggregates (Rounded) */}
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle>Clinic Overview (Aggregated)</CardTitle>
          <CardDescription>High-level metrics without patient identifiers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 rounded-lg bg-card/30 border border-border/50">
              <div className="text-3xl font-bold text-primary">~50</div>
              <div className="text-sm text-muted-foreground mt-1">Total Surgeries</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card/30 border border-border/50">
              <div className="text-3xl font-bold text-primary">~140K</div>
              <div className="text-sm text-muted-foreground mt-1">Total Grafts</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card/30 border border-border/50">
              <div className="text-3xl font-bold text-primary">~35%</div>
              <div className="text-sm text-muted-foreground mt-1">Conversion Rate</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-card/30 border border-border/50">
              <div className="text-3xl font-bold text-primary">~120</div>
              <div className="text-sm text-muted-foreground mt-1">Active Patients</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ElementType;
  trend: 'up' | 'down';
}

function KPICard({ title, value, change, icon: Icon, trend }: KPICardProps) {
  return (
    <Card className="glass-card border-border hover:shadow-lg transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className={`text-sm mt-2 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {change} from last period
        </p>
      </CardContent>
    </Card>
  );
}
