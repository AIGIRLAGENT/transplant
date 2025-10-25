import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Users, Calendar, TrendingUp, DollarSign, Scissors, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

// Mock data for charts
const revenueData = [
  { month: 'Jan', revenue: 45000 },
  { month: 'Feb', revenue: 52000 },
  { month: 'Mar', revenue: 48000 },
  { month: 'Apr', revenue: 61000 },
  { month: 'May', revenue: 70000 },
  { month: 'Jun', revenue: 65000 },
];

const surgeriesData = [
  { month: 'Jan', surgeries: 12 },
  { month: 'Feb', surgeries: 15 },
  { month: 'Mar', surgeries: 11 },
  { month: 'Apr', surgeries: 18 },
  { month: 'May', surgeries: 21 },
  { month: 'Jun', surgeries: 19 },
];

const leadSourcesData = [
  { name: 'Google Ads', value: 35, color: '#22c55e' },
  { name: 'Referral', value: 28, color: '#3b82f6' },
  { name: 'Website', value: 20, color: '#a855f7' },
  { name: 'Social Media', value: 17, color: '#f97316' },
];

const todaySchedule = [
  { time: '09:00', patient: 'John D.', type: 'Consult', status: 'upcoming' },
  { time: '10:30', patient: 'Sarah M.', type: 'Follow-up', status: 'completed' },
  { time: '13:00', patient: 'Mike J.', type: 'Consult', status: 'upcoming' },
  { time: '15:00', patient: 'Emma W.', type: 'Surgery', status: 'upcoming' },
];

export default function Dashboard() {
  const { role, user } = useAuth();
  const { tenant } = useTheme();

  const isOwner = role === 'OWNER' || role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8 space-y-8">
      {/* Header */}
      <div className="glass p-6 rounded-xl border border-border">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
          Welcome back, {user?.displayName || user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          {tenant?.name || 'Loading clinic...'} • <span className="text-primary font-medium">{role}</span>
        </p>
      </div>

      {isOwner ? <OwnerDashboard /> : <DoctorDashboard />}
    </div>
  );
}

function OwnerDashboard() {
  return (
    <>
      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Monthly Revenue"
          value="$65,000"
          change="+12.5%"
          trend="up"
          icon={DollarSign}
          description="vs last month"
        />
        <MetricCard
          title="Active Patients"
          value="127"
          change="+12"
          trend="up"
          icon={Users}
          description="this month"
        />
        <MetricCard
          title="Surgeries Booked"
          value="19"
          change="-2"
          trend="down"
          icon={Scissors}
          description="this month"
        />
        <MetricCard
          title="Conversion Rate"
          value="34%"
          change="+5%"
          trend="up"
          icon={TrendingUp}
          description="consult to surgery"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 6 months performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Surgeries Chart */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Surgeries Completed</CardTitle>
            <CardDescription>Monthly breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={surgeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="surgeries" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lead Sources */}
        <Card className="glass-card border-border">
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Patient acquisition channels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={leadSourcesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Today's Overview</CardTitle>
            <CardDescription>Real-time clinic activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Appointments Today</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">23</div>
                <div className="text-sm text-muted-foreground">Proposals Pending</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">5</div>
                <div className="text-sm text-muted-foreground">Surgeries This Week</div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-muted-foreground">New Leads</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DoctorDashboard() {
  return (
    <>
      {/* Doctor Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="My Patients"
          value="42"
          change="+3"
          trend="up"
          icon={Users}
          description="active patients"
        />
        <MetricCard
          title="Today's Schedule"
          value="6"
          change="2 remaining"
          trend="neutral"
          icon={Calendar}
          description="appointments"
        />
        <MetricCard
          title="My Surgeries"
          value="8"
          change="+1"
          trend="up"
          icon={Scissors}
          description="this month"
        />
        <MetricCard
          title="Avg. Grafts"
          value="2,850"
          change="+120"
          trend="up"
          icon={Activity}
          description="per surgery"
        />
      </div>

      {/* Today's Schedule */}
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today's Schedule
          </CardTitle>
          <CardDescription>Your appointments for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {todaySchedule.map((apt, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/30 backdrop-blur hover:bg-card/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-mono text-muted-foreground">{apt.time}</div>
                  <div>
                    <div className="font-medium">{apt.patient}</div>
                    <div className="text-sm text-muted-foreground">{apt.type}</div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  apt.status === 'completed'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {apt.status}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clinic Overview (Aggregated) */}
      <Card className="glass-card border-border">
        <CardHeader>
          <CardTitle>Clinic Overview</CardTitle>
          <CardDescription>Aggregated metrics (rounded for privacy)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-3xl font-bold">~130</div>
              <div className="text-sm text-muted-foreground">Total Active Patients</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">~20</div>
              <div className="text-sm text-muted-foreground">Surgeries This Month</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">~35%</div>
              <div className="text-sm text-muted-foreground">Conversion Rate</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">~15</div>
              <div className="text-sm text-muted-foreground">New Leads</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  description: string;
}

function MetricCard({ title, value, change, trend, icon: Icon, description }: MetricCardProps) {
  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    neutral: 'text-muted-foreground',
  };

  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;

  return (
    <Card className="glass-card border-border hover:shadow-lg transition-all duration-300 hover:scale-105">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <div className="flex items-center gap-1 mt-2">
          {TrendIcon && <TrendIcon className={`h-4 w-4 ${trendColors[trend]}`} />}
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {change}
          </span>
          <span className="text-sm text-muted-foreground ml-1">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}
