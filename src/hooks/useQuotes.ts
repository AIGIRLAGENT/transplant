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
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import type { Quote } from '@/types';

export function useQuotes(patientId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['quotes', tenantId, patientId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant selected');

      console.log('[useQuotes] Fetching quotes for:', { tenantId, patientId });

      const quotesRef = collection(db, `tenants/${tenantId}/quotes`);
      
      let snapshot;
      
      if (patientId) {
        console.log('[useQuotes] Filtering by patientId:', patientId);
        // First try with both where and orderBy (requires composite index)
        try {
          const q = query(quotesRef, where('patientId', '==', patientId), orderBy('createdAt', 'desc'));
          snapshot = await getDocs(q);
          console.log('[useQuotes] Query with composite index succeeded');
        } catch (error) {
          console.warn('[useQuotes] Composite index not available, falling back to client-side sort:', error);
          // Fallback: just filter by patientId, sort client-side
          const q = query(quotesRef, where('patientId', '==', patientId));
          snapshot = await getDocs(q);
        }
      } else {
        const q = query(quotesRef, orderBy('createdAt', 'desc'));
        snapshot = await getDocs(q);
      }

      const quotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Quote[];
      
      // Sort client-side if we didn't use orderBy in query
      const sortedQuotes = patientId 
        ? quotes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : quotes;
      
      console.log('[useQuotes] Found quotes:', sortedQuotes.length, sortedQuotes);
      
      return sortedQuotes;
    },
    enabled: !!tenantId,
  });
}

export function useQuote(quoteId?: string) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['quote', tenantId, quoteId],
    queryFn: async () => {
      if (!tenantId || !quoteId) throw new Error('Missing required data');

      const quoteDoc = await getDoc(
        doc(db, `tenants/${tenantId}/quotes`, quoteId)
      );

      if (!quoteDoc.exists()) throw new Error('Quote not found');

      return {
        id: quoteDoc.id,
        ...quoteDoc.data(),
      } as Quote;
    },
    enabled: !!tenantId && !!quoteId,
  });
}

export function useCreateQuote() {
  const { tenantId, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!tenantId || !user) throw new Error('Not authenticated');

      console.log('[useCreateQuote] Creating quote with data:', data);

      const quoteId = `quote-${Date.now()}`;
      const quoteData: Omit<Quote, 'id'> = {
        ...data,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[useCreateQuote] Saving to Firestore:', {
        path: `tenants/${tenantId}/quotes/${quoteId}`,
        data: quoteData,
      });

      await setDoc(
        doc(db, `tenants/${tenantId}/quotes`, quoteId),
        quoteData
      );

      console.log('[useCreateQuote] Quote saved successfully:', quoteId);

      return { id: quoteId, ...quoteData };
    },
    onSuccess: (data) => {
      console.log('[useCreateQuote] onSuccess, invalidating queries. Quote data:', data);
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
    },
  });
}

export function useUpdateQuote() {
  const { tenantId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      quoteId, 
      data 
    }: { 
      quoteId: string; 
      data: Partial<Quote> 
    }) => {
      if (!tenantId) throw new Error('No tenant selected');

      await updateDoc(
        doc(db, `tenants/${tenantId}/quotes`, quoteId),
        {
          ...data,
          updatedAt: new Date(),
        }
      );

      return { quoteId, data };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ 
        queryKey: ['quote', tenantId, variables.quoteId] 
      });
    },
  });
}
