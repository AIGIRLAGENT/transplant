import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Patient } from '@/types';

export function usePatients(filters?: { status?: string; search?: string }) {
  const { tenantId, role: userRole, user } = useAuth();

  return useQuery({
    queryKey: ['patients', tenantId, userRole, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const patientsRef = collection(db, `tenants/${tenantId}/patients`);
      let snapshot;

      // Role-based filtering
      if (userRole === 'DOCTOR') {
        console.log('[usePatients] Doctor scope query for UID:', user?.uid);
        try {
          // Requires composite index (primaryDoctorId + createdAt desc)
          const q = query(
            patientsRef,
            where('primaryDoctorId', '==', user?.uid),
            orderBy('createdAt', 'desc')
          );
          snapshot = await getDocs(q);
          console.log('[usePatients] Composite index query succeeded');
        } catch (error) {
          console.warn('[usePatients] Composite index missing, falling back to client-side sort:', error);
          const q = query(
            patientsRef,
            where('primaryDoctorId', '==', user?.uid)
          );
          snapshot = await getDocs(q);
        }
      } else {
        const q = query(patientsRef, orderBy('createdAt', 'desc'));
        snapshot = await getDocs(q);
      }

      let patients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Patient[];

      // If we fell back (doctor case), ensure client-side sorting by createdAt desc
      if (userRole === 'DOCTOR') {
        patients = patients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      // Client-side filtering
      if (filters?.status) {
        patients = patients.filter(p => p.status === filters.status);
      }

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        patients = patients.filter(p => 
          p.firstName?.toLowerCase().includes(search) ||
          p.lastName?.toLowerCase().includes(search) ||
          p.email?.toLowerCase().includes(search)
        );
      }

      return patients;
    },
    enabled: !!tenantId,
  });
}

export function usePatient(patientId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['patient', tenantId, patientId],
    queryFn: async () => {
      if (!tenantId || !patientId) throw new Error('Missing required data');

      const patientDoc = await getDoc(
        doc(db, `tenants/${tenantId}/patients`, patientId)
      );

      if (!patientDoc.exists()) throw new Error('Patient not found');

      return {
        id: patientDoc.id,
        ...patientDoc.data(),
      } as Patient;
    },
    enabled: !!tenantId && !!patientId,
  });
}

export function useCreatePatient() {
  const { tenantId, user, role: userRole } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Patient, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
      if (!tenantId || !user) throw new Error('Not authenticated');

      let primaryDoctorId = data.primaryDoctorId;
      // Prefer assigning to the current doctor creating the patient
      if (!primaryDoctorId) {
        if (userRole === 'DOCTOR') {
          primaryDoctorId = user.uid;
        } else {
          // Admin/Coordinator flow: pick first active doctor or fallback to current user
          const doctorsRef = collection(db, `tenants/${tenantId}/doctors`);
          const doctorsSnap = await getDocs(query(doctorsRef, where('active', '==', true)));
          if (!doctorsSnap.empty) {
            primaryDoctorId = doctorsSnap.docs[0].data().userId;
          } else {
            primaryDoctorId = user.uid;
          }
        }
      }

      const patientId = `patient-${Date.now()}`;
      const patientData = {
        ...data,
        primaryDoctorId,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(
        doc(db, `tenants/${tenantId}/patients`, patientId),
        patientData
      );

      return { id: patientId, ...patientData } as Patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

export function useUpdatePatient() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      patientId, 
      data 
    }: { 
      patientId: string; 
      data: Partial<Patient> 
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      await updateDoc(
        doc(db, `tenants/${tenantId}/patients`, patientId),
        {
          ...data,
          updatedAt: new Date(),
        }
      );

      return { patientId, data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ 
        queryKey: ['patient', tenantId, variables.patientId] 
      });
    },
  });
}

export function useDeletePatient() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      await deleteDoc(
        doc(db, `tenants/${tenantId}/patients`, patientId)
      );

      return patientId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
