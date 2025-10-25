export default function SettingsPage() {
  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="glass p-6 rounded-xl border border-border">
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-6">Tenant profile and theme customization (coming soon)</p>
        <div className="rounded-lg border border-border/60 bg-card/60 backdrop-blur p-8 text-muted-foreground">
          Accent color and branding controls will appear here.
        </div>
      </div>
    </div>
  );
}
