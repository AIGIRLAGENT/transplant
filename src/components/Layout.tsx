import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react';

export default function Layout() {
  const { signOut, role, user } = useAuth();
  const { theme, toggleTheme, tenant } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const logoSrc = tenant?.logo || tenant?.themeObject?.logoUrl || '/logo.png';

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['OWNER', 'ADMIN', 'DOCTOR', 'COORDINATOR', 'FINANCE', 'VIEWER'] },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', roles: ['OWNER', 'ADMIN', 'DOCTOR', 'COORDINATOR'] },
    { to: '/patients', icon: Users, label: 'Patients', roles: ['OWNER', 'ADMIN', 'DOCTOR', 'COORDINATOR'] },
    { to: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['OWNER', 'ADMIN', 'DOCTOR'] },
    { to: '/settings', icon: Settings, label: 'Settings', roles: ['OWNER', 'ADMIN'] },
  ];

  const filteredNavItems = navItems.filter((item) => role && item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-[140px] dark:bg-emerald-500/10" />
        <div className="absolute top-1/4 right-0 h-[420px] w-[420px] rounded-full bg-emerald-400/15 blur-[180px] dark:bg-sky-500/20" />
        <div className="absolute bottom-[-120px] left-1/3 h-[360px] w-[360px] rounded-full bg-primary/10 blur-[160px] dark:bg-emerald-400/12" />
      </div>

      <aside className="relative z-10 flex w-[18rem] flex-col border-r border-white/20 bg-white/70 px-6 py-8 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
        <Link to="/dashboard" className="flex items-center gap-3">
          <img
            src={logoSrc}
            alt={`${tenant?.name || 'Clinic'} logo`}
            className="h-12 w-auto object-contain"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight text-foreground truncate">
              {tenant?.name || 'Clinic'}
            </h2>
            <p className="text-xs font-medium capitalize text-muted-foreground/80">{role?.toLowerCase()}</p>
          </div>
        </Link>

        <nav className="mt-8 flex-1 space-y-2 overflow-hidden">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white/90 text-foreground shadow-[0_16px_36px_-18px_rgba(16,185,129,0.35)] ring-1 ring-primary/40 dark:bg-slate-800/90'
                    : 'bg-white/30 text-foreground/80 hover:bg-white/60 hover:text-foreground dark:bg-slate-800/50 dark:text-slate-300 dark:hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`h-5 w-5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-primary'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 space-y-3 rounded-2xl border border-white/40 bg-white/40 p-4 text-xs text-muted-foreground backdrop-blur dark:border-white/10 dark:bg-slate-800/70">
          <div>
            <p className="truncate text-foreground font-medium text-sm">{user?.email}</p>
            <p className="mt-1 capitalize">Role: {role?.toLowerCase()}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-full justify-start rounded-xl border border-transparent bg-white/30 text-foreground transition hover:border-primary/40 hover:bg-white/60 dark:bg-slate-700/70 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start rounded-xl border border-transparent bg-destructive/10 text-destructive hover:border-destructive/40 hover:bg-destructive/15"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <main className="relative z-10 flex flex-1 flex-col overflow-hidden px-6 py-8">
        <div className="relative flex h-full w-full overflow-hidden rounded-[28px] border border-white/40 bg-white/75 shadow-[0_28px_70px_-32px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
          <div className="pointer-events-none absolute -top-48 right-16 h-[380px] w-[380px] rounded-full bg-primary/12 blur-[160px] dark:bg-emerald-400/12" />
          <div className="pointer-events-none absolute bottom-[-120px] left-24 h-[320px] w-[320px] rounded-full bg-emerald-400/10 blur-[150px] dark:bg-sky-500/12" />
          <div className="relative flex-1 overflow-hidden">
            <div className="h-full w-full overflow-y-auto px-8 py-10">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
