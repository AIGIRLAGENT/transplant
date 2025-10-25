import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TenantInfo {
  id: string;
  name: string;
  role: string;
}

export default function ClinicSwitcher() {
  const { tenantMembers, selectTenant, tenantId } = useAuth();
  const { tenant } = useTheme();
  const navigate = useNavigate();
  const [tenantInfos, setTenantInfos] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tenant names
  useEffect(() => {
    async function fetchTenantNames() {
      if (tenantMembers.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const infos = await Promise.all(
          tenantMembers.map(async (member) => {
            try {
              const tenantDoc = await getDoc(doc(db, 'tenants', member.tenantId));
              const tenantData = tenantDoc.data();
              return {
                id: member.tenantId,
                name: tenantData?.name || member.tenantId,
                role: member.role,
              };
            } catch (error) {
              console.error(`Error fetching tenant ${member.tenantId}:`, error);
              return {
                id: member.tenantId,
                name: member.tenantId,
                role: member.role,
              };
            }
          })
        );
        setTenantInfos(infos);
      } catch (error) {
        console.error('Error fetching tenant names:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTenantNames();
  }, [tenantMembers]);

  // Redirect to dashboard if tenant is already selected
  useEffect(() => {
    if (tenantId && tenant) {
      navigate('/', { replace: true });
    }
  }, [tenantId, tenant, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading clinics...</p>
        </div>
      </div>
    );
  }

  if (tenantMembers.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md glass">
          <CardHeader>
            <CardTitle>No Clinics Found</CardTitle>
            <CardDescription>
              You are not currently a member of any clinic. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (tenantId && tenant) {
    // Already selected, this shouldn't render but just in case
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl glass">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-2xl bg-primary/10">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Select Your Clinic</CardTitle>
          <CardDescription className="text-center">
            Choose which clinic you want to access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {tenantInfos.map((info) => (
              <button
                key={info.id}
                onClick={() => selectTenant(info.id)}
                className="flex items-start gap-4 p-4 rounded-lg border-2 border-border hover:border-primary transition-colors text-left group"
              >
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors overflow-hidden">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {info.name}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {info.role.toLowerCase()}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
