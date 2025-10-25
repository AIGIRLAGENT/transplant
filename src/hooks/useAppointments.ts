import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Appointment } from '@/types';

// Fetch all appointments for a tenant
export function useAppointments() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['appointments', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const appointmentsRef = collection(db, 'tenants', tenantId, 'appointments');
      const q = query(appointmentsRef, orderBy('start', 'asc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => mapAppointment(doc.id, doc.data()));
    },
    enabled: !!tenantId,
  });
}

// Fetch appointments for a specific date range
export function useAppointmentsInRange(startDate: Date, endDate: Date) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['appointments', tenantId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const appointmentsRef = collection(db, 'tenants', tenantId, 'appointments');
      const q = query(
        appointmentsRef,
        where('start', '>=', Timestamp.fromDate(startDate)),
        where('start', '<=', Timestamp.fromDate(endDate)),
        orderBy('start', 'asc')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => mapAppointment(doc.id, doc.data()));
    },
    enabled: !!tenantId,
  });
}

// Fetch single appointment
export function useAppointment(appointmentId: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['appointment', tenantId, appointmentId],
    queryFn: async () => {
      if (!tenantId || !appointmentId) throw new Error('Missing required parameters');

      const appointmentRef = doc(db, 'tenants', tenantId, 'appointments', appointmentId);
      const snapshot = await getDoc(appointmentRef);

      if (!snapshot.exists()) {
        throw new Error('Appointment not found');
      }

      return mapAppointment(snapshot.id, snapshot.data());
    },
    enabled: !!tenantId && !!appointmentId,
  });
}

function mapAppointment(id: string, data: Record<string, any>): Appointment {
  const toDate = (value: any): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const start = toDate(data.start) ?? new Date();
  const end = toDate(data.end) ?? new Date(start.getTime() + 60 * 60 * 1000);

  return {
    id,
    ...data,
    start,
    end,
    startTime: toDate(data.startTime) ?? start,
    endTime: toDate(data.endTime) ?? end,
    holdExpiresAt: toDate(data.holdExpiresAt),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
    teamIds: Array.isArray(data.teamIds) ? data.teamIds : [],
  } as Appointment;
}

// Create appointment with conflict detection
export function useCreateAppointment() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: Omit<Appointment, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
    ) => {
      if (!tenantId || !user?.uid) throw new Error('Missing required parameters');

      // Run conflict detection in a transaction
      const result = await runTransaction(db, async (transaction) => {
        const appointmentsRef = collection(db, 'tenants', tenantId, 'appointments');
        
        // Check for conflicts (simplified - in production, query by time range)
        const conflictQuery = query(
          appointmentsRef,
          where('doctorId', '==', input.doctorId),
          where('start', '>=', Timestamp.fromDate(new Date(input.start.getTime() - 24 * 60 * 60 * 1000))),
          where('start', '<=', Timestamp.fromDate(new Date(input.start.getTime() + 24 * 60 * 60 * 1000)))
        );
        
        const conflictSnapshot = await getDocs(conflictQuery);
        
        // Check for time overlap
        const hasConflict = conflictSnapshot.docs.some((doc) => {
          const data = doc.data();
          const existingStart = data.start.toDate();
          const existingEnd = data.end.toDate();
          const newStart = input.start;
          const newEnd = input.end;

          // Check if cancelled or no-show (not a conflict)
          if (data.status === 'CANCELLED' || data.status === 'NO_SHOW') {
            return false;
          }

          return (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
          );
        });

        if (hasConflict) {
          throw new Error('Time slot conflict detected');
        }

        // Create the appointment
        const newAppointmentRef = doc(appointmentsRef);
        const now = Timestamp.now();
        
        const appointmentData = {
          ...input,
          tenantId,
          start: Timestamp.fromDate(input.start),
          end: Timestamp.fromDate(input.end),
          holdExpiresAt: input.holdExpiresAt ? Timestamp.fromDate(input.holdExpiresAt) : null,
          createdAt: now,
          updatedAt: now,
        };

        transaction.set(newAppointmentRef, appointmentData);

        return { id: newAppointmentRef.id, ...appointmentData };
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
    },
  });
}

// Update appointment
export function useUpdateAppointment() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Appointment, 'id' | 'tenantId' | 'createdAt'>>;
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      const appointmentRef = doc(db, 'tenants', tenantId, 'appointments', id);
      
      const updateData: any = {
        ...data,
        updatedAt: Timestamp.now(),
      };

      // Convert Date objects to Timestamps
      if (data.start) updateData.start = Timestamp.fromDate(data.start);
      if (data.end) updateData.end = Timestamp.fromDate(data.end);
      if (data.holdExpiresAt) updateData.holdExpiresAt = Timestamp.fromDate(data.holdExpiresAt);

      await updateDoc(appointmentRef, updateData);
      return { id, ...updateData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
    },
  });
}

// Delete appointment
export function useDeleteAppointment() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No tenant selected');

      const appointmentRef = doc(db, 'tenants', tenantId, 'appointments', id);
      await deleteDoc(appointmentRef);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
    },
  });
}

// Fetch doctors for resource filtering
export function useDoctors() {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['doctors', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      const doctorsRef = collection(db, 'tenants', tenantId, 'doctors');
      const q = query(doctorsRef, where('active', '==', true));
      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      }));
    },
    enabled: !!tenantId,
  });
}
