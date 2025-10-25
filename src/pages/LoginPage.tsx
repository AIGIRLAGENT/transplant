import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Moon, Sun, CheckCircle2, CalendarDays, Sparkles, Mail } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { theme, toggleTheme, tenant } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const logoSrc = tenant?.logo || tenant?.themeObject?.logoUrl || '/logo.png';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      // Force a fresh token to ensure custom claims are present immediately
      await auth.currentUser?.getIdToken(true);
      // Navigate to clinic selection (ProtectedRoute will handle dashboard redirect if tenant already selected)
      navigate('/select-clinic', { replace: true });
    } catch (err: any) {
      const msg = err?.code?.startsWith('auth/') ? err.code.replace('auth/', '').replace(/-/g, ' ') : err?.message;
      setError(msg || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted px-6 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className="absolute top-6 right-6 rounded-full border border-border/60 backdrop-blur"
      >
        {theme === 'dark' ? (
          <Sun className="h-4 w-4 mr-2" />
        ) : (
          <Moon className="h-4 w-4 mr-2" />
        )}
        {theme === 'dark' ? 'Light' : 'Dark'} Mode
      </Button>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-[140px] dark:bg-emerald-500/10" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-emerald-400/10 blur-[160px] dark:bg-sky-500/10" />
        <div className="absolute top-24 right-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[120px] dark:bg-primary/5" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-8 text-center text-foreground lg:max-w-xl lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary/90">
            <Sparkles className="h-3 w-3" />
            Premium Patient Experience
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              {tenant?.name || 'Green Valley Hair Clinic'}
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg dark:text-slate-300">
              Capture patient photos once and wow them with true-to-life, AI-generated post-surgery previews—while your team handles consults, proposals, and scheduling in a single workspace.
            </p>
          </div>
          <ul className="space-y-3 text-sm sm:text-base text-foreground/90 dark:text-slate-200">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
              Automated milestones push consults, surgeries, and follow-ups to your shared calendar.
            </li>
            <li className="flex items-start gap-3">
              <CalendarDays className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
              Track patient readiness with live funnel insights and downloadable proposal packs.
            </li>
            <li className="flex items-start gap-3">
              <Sparkles className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
              Generate photorealistic, post-transplant looks in seconds using your patient’s real imagery—no stock composites.
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
              Automated email & SMS cadence keeps patients informed: pre-op education at Day −14 and −3, day-of reminders, plus post-op touchpoints on Day 2, Day 5, and Day 10 with recovery tips and survey links.
            </li>
          </ul>
        </div>

        <div className="w-full max-w-md lg:max-w-lg">
          <div className="rounded-[26px] bg-gradient-to-br from-primary/20 via-transparent to-emerald-400/20 p-[1px] shadow-[0_24px_60px_-30px_rgba(16,185,129,0.55)] dark:from-emerald-500/30 dark:via-slate-900 dark:to-sky-500/25 dark:shadow-[0_26px_70px_-35px_rgba(56,189,248,0.45)]">
            <Card className="glass-card border border-border/60 backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/80">
              <CardHeader className="space-y-1">
                <div className="flex justify-center pb-4">
                  <img
                    src={logoSrc}
                    alt={`${tenant?.name || 'Clinic'} logo`}
                    className="h-20 w-auto object-contain"
                  />
                </div>
                <CardTitle className="text-3xl font-bold text-center">Welcome Back</CardTitle>
                <CardDescription className="text-center">
                  Sign in to access your clinic platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="doctor@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
