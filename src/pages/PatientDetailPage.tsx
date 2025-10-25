import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, Edit, Trash2, Calendar as CalendarIcon, FileText, 
  Phone, Mail, MapPin, Camera, Sparkles, Download,
  Eye, CheckCircle2, AlertCircle, Plus, X, Save, Clock,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { usePatient, useDeletePatient, useUpdatePatient } from '@/hooks/usePatients';
import { useQuotes, useCreateQuote } from '@/hooks/useQuotes';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { generateEnhancedImage } from '@/lib/gemini';
import { storage, db } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, getBlob } from 'firebase/storage';
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { PatientStatus, PatientMilestones, AppointmentType, AppointmentStatus } from '@/types';
import { generatePatientPdf } from '@/lib/pdf';

type MilestoneKey = Extract<keyof PatientMilestones, string>;

const MS_PER_DAY = 86_400_000;
const AUGUST_2025 = new Date(2025, 7, 1);

const MILESTONE_CONFIGS: Array<{
  key: MilestoneKey;
  label: string;
  type: AppointmentType;
  idSuffix: string;
  durationMinutes: number;
  hour: number;
}> = [
  { key: 'consultDate', label: 'Consultation', type: 'CONSULT', idSuffix: 'consult', durationMinutes: 60, hour: 9 },
  { key: 'proposalSentDate', label: 'Proposal Sent', type: 'PROPOSAL', idSuffix: 'proposal', durationMinutes: 30, hour: 10 },
  { key: 'surgeryDate', label: 'Surgery', type: 'SURGERY', idSuffix: 'surgery', durationMinutes: 240, hour: 11 },
  { key: 'followUpDate', label: 'Follow-up', type: 'FOLLOWUP', idSuffix: 'followup', durationMinutes: 45, hour: 15 },
];

const seededRandom = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const value = Math.abs(Math.sin(hash) * 10000);
  return value - Math.floor(value);
};

const randomInt = (seed: string, min: number, max: number) => {
  const rnd = seededRandom(seed);
  return Math.floor(rnd * (max - min + 1)) + min;
};

const generatePlaceholderMilestones = (patientId: string): PatientMilestones => {
  const baseOffset = randomInt(`${patientId}-base`, 0, 60);
  const consultDate = new Date(AUGUST_2025.getTime() + baseOffset * MS_PER_DAY);
  const proposalDate = new Date(AUGUST_2025.getTime() + (baseOffset + 5 + randomInt(`${patientId}-proposal`, 0, 5)) * MS_PER_DAY);
  const surgeryDate = new Date(AUGUST_2025.getTime() + (baseOffset + 25 + randomInt(`${patientId}-surgery`, 0, 15)) * MS_PER_DAY);
  const followUpDate = new Date(AUGUST_2025.getTime() + (baseOffset + 55 + randomInt(`${patientId}-follow`, 0, 15)) * MS_PER_DAY);

  return {
    consultDate,
    proposalSentDate: proposalDate,
    surgeryDate,
    followUpDate,
  };
};

const STATUS_OPTIONS: { value: PatientStatus; label: string }[] = [
  { value: 'new-lead', label: 'New Lead' },
  { value: 'lead', label: 'Lead' },
  { value: 'consulted', label: 'Consulted' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'booked', label: 'Booked' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const GENDER_OPTIONS = [
  { value: 'not-set', label: 'Prefer not to say' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(patientId);
  const { data: quotes = [], isLoading: quotesLoading, refetch: refetchQuotes } = useQuotes(patientId);
  const { data: appointments = [] } = useAppointments();
  const createQuote = useCreateQuote();
  const updatePatient = useUpdatePatient();
  const { user, tenantId } = useAuth();
  const { tenant } = useTheme();
  const deletePatient = useDeletePatient();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const DISABLE_UPLOADS = import.meta.env.VITE_DISABLE_STORAGE_UPLOADS === 'true';
  
  const [medicalNotes, setMedicalNotes] = useState('');
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImages, setAfterImages] = useState<string[]>([]); // new multiple variants
  const [afterImageLabels, setAfterImageLabels] = useState<string[]>([]); // labels for variants
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditingAssessment, setIsEditingAssessment] = useState(false);
  const [isEditingPatientInfo, setIsEditingPatientInfo] = useState(false);
  const emptyMilestonesState: Record<MilestoneKey, string> = {
    consultDate: '',
    proposalSentDate: '',
    surgeryDate: '',
    followUpDate: '',
  };
  const [milestoneForm, setMilestoneForm] = useState<Record<MilestoneKey, string>>({ ...emptyMilestonesState });
  const [isEditingMilestones, setIsEditingMilestones] = useState(false);
  const [isSavingMilestones, setIsSavingMilestones] = useState(false);
  const [isAddingQuote, setIsAddingQuote] = useState(false);
  const [newQuoteItems, setNewQuoteItems] = useState<Array<{ zone: string; graftCount: number; unitPrice: number }>>([
    { zone: '', graftCount: 0, unitPrice: 0 }
  ]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const autoFilledMilestones = useRef(false);

  // Fullscreen lightbox state for comparing Before (left) vs After variants (right)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const toInputDate = (value: unknown): string => {
    if (!value) return '';
    let date: Date | undefined;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    } else if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
      const maybeDate = value.toDate();
      if (!Number.isNaN(maybeDate?.getTime?.() ?? NaN)) {
        date = maybeDate;
      }
    }

    if (!date || Number.isNaN(date.getTime())) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const parseInputDate = (value: string): Date | null => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const [patientForm, setPatientForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    age: '',
    gender: 'not-set' as 'not-set' | 'male' | 'female' | 'other',
    leadSource: '',
  });

  const [assessmentData, setAssessmentData] = useState({
    hairlineRecession: '',
    hairDensity: '',
    donorAreaQuality: '',
    scalpLaxity: '',
    estimatedGrafts: '',
    recommendedTechnique: '',
  });

  // Initialize data from patient when loaded
  useEffect(() => {
    if (patient) {
      setMedicalNotes(patient.medicalNotes || '');
  setBeforeImage(patient.beforeImageUrl || null);
      // Load multiple variants if present
      if ((patient as any).afterImageUrls && Array.isArray((patient as any).afterImageUrls)) {
        setAfterImages((patient as any).afterImageUrls as string[]);
        if ((patient as any).afterImageStyles && Array.isArray((patient as any).afterImageStyles)) {
          setAfterImageLabels((patient as any).afterImageStyles as string[]);
        } else {
          setAfterImageLabels(((patient as any).afterImageUrls as string[]).map((_, i) => `Variant ${i + 1}`));
        }
      } else if (patient.afterImageUrl) {
        setAfterImages([patient.afterImageUrl]);
        setAfterImageLabels(['Variant 1']);
      } else {
        setAfterImages([]);
        setAfterImageLabels([]);
      }
      setPatientForm({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        email: patient.email || '',
        phone: patient.phone || '',
        address: patient.address || '',
        age: patient.age ? String(patient.age) : '',
        gender: (patient.gender || 'not-set') as 'not-set' | 'male' | 'female' | 'other',
        leadSource: patient.leadSource || '',
      });
      setMilestoneForm({
        consultDate: toInputDate(patient.milestones?.consultDate ?? null),
        proposalSentDate: toInputDate(patient.milestones?.proposalSentDate ?? null),
        surgeryDate: toInputDate(patient.milestones?.surgeryDate ?? null),
        followUpDate: toInputDate(patient.milestones?.followUpDate ?? null),
      });
      if (patient.assessment) {
        setAssessmentData({
          hairlineRecession: patient.assessment.hairlineRecession || '',
          hairDensity: patient.assessment.hairDensity || '',
          donorAreaQuality: patient.assessment.donorAreaQuality || '',
          scalpLaxity: patient.assessment.scalpLaxity || '',
          estimatedGrafts: patient.assessment.estimatedGrafts || '',
          recommendedTechnique: patient.assessment.recommendedTechnique || '',
        });
      }
    } else {
      setMilestoneForm({ ...emptyMilestonesState });
    }
  }, [patient]);

  // Debug: Log quotes when they change
  useEffect(() => {
    console.log('[PatientDetailPage] Quotes updated:', quotes.length, 'quotes for patient:', patientId);
    console.log('[PatientDetailPage] Quotes data:', quotes);
  }, [quotes, patientId]);

  useEffect(() => {
    if (!isCameraOpen || !videoRef.current || !cameraStream) return;

    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch((error) => {
      console.error('Video play error:', error);
    });

    return () => {
      cameraStream.getTracks().forEach(track => track.stop());
    };
  }, [isCameraOpen, cameraStream]);

  // Prevent background scroll when camera or lightbox overlay is open
  useEffect(() => {
    const shouldLock = isCameraOpen || isLightboxOpen;
    if (shouldLock) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isCameraOpen, isLightboxOpen]);

  // Keyboard controls for lightbox navigation and close
  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((i) => (afterImages.length ? (i + 1) % afterImages.length : 0));
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((i) => (afterImages.length ? (i - 1 + afterImages.length) % afterImages.length : 0));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLightboxOpen, afterImages.length]);

  const openLightboxAt = (index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const handleAssessmentChange = (field: string, value: string) => {
    setAssessmentData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAssessment = async () => {
    if (!patientId) return;
    try {
      await updatePatient.mutateAsync({
        patientId,
        data: {
          assessment: assessmentData,
          medicalNotes,
        },
      });
      setIsEditingAssessment(false);
      toast({
        title: 'Assessment Saved',
        description: 'Medical assessment updated successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save assessment',
      });
    }
  };

  const handlePatientFieldChange = (field: keyof typeof patientForm, value: string) => {
    setPatientForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePatientInfo = async () => {
    if (!patientId) return;
    try {
      const parsedAge = patientForm.age ? parseInt(patientForm.age, 10) : undefined;
      await updatePatient.mutateAsync({
        patientId,
        data: {
          firstName: patientForm.firstName,
          lastName: patientForm.lastName,
          email: patientForm.email || undefined,
          phone: patientForm.phone || undefined,
          address: patientForm.address || undefined,
          age: Number.isNaN(parsedAge) ? undefined : parsedAge,
          gender: patientForm.gender === 'not-set' ? undefined : patientForm.gender,
          leadSource: patientForm.leadSource || undefined,
        },
      });
      setIsEditingPatientInfo(false);
      toast({
        title: 'Patient Updated',
        description: 'Patient details have been updated successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update patient details.',
      });
    }
  };

  const handleCancelPatientEdit = () => {
    if (!patient) return;
    setPatientForm({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      email: patient.email || '',
      phone: patient.phone || '',
      address: patient.address || '',
      age: patient.age ? String(patient.age) : '',
      gender: (patient.gender || 'not-set') as 'not-set' | 'male' | 'female' | 'other',
      leadSource: patient.leadSource || '',
    });
    setIsEditingPatientInfo(false);
  };

  const handleMilestoneFieldChange = (field: MilestoneKey, value: string) => {
    setMilestoneForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCancelMilestones = () => {
    if (patient) {
      setMilestoneForm({
        consultDate: toInputDate(patient.milestones?.consultDate ?? null),
        proposalSentDate: toInputDate(patient.milestones?.proposalSentDate ?? null),
        surgeryDate: toInputDate(patient.milestones?.surgeryDate ?? null),
        followUpDate: toInputDate(patient.milestones?.followUpDate ?? null),
      });
    } else {
      setMilestoneForm({ ...emptyMilestonesState });
    }
    setIsEditingMilestones(false);
  };
  const syncMilestoneAppointments = useCallback(async (milestones: PatientMilestones) => {
    if (!tenantId || !patientId || !patient) return;

    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.id;
    const doctorId = patient.primaryDoctorId || user?.uid || 'unassigned';
    const now = new Date();

    await Promise.all(
      MILESTONE_CONFIGS.map(async (config) => {
        const dateValue = milestones[config.key] ?? null;
        const appointmentRef = doc(db, 'tenants', tenantId, 'appointments', `${patientId}-${config.idSuffix}`);

        if (dateValue) {
          const start = new Date(dateValue);
          start.setHours(config.hour, 0, 0, 0);
          const end = new Date(start.getTime() + config.durationMinutes * 60 * 1000);
          const status: AppointmentStatus = end.getTime() < now.getTime() ? 'COMPLETED' : 'CONFIRMED';

          const data: Record<string, unknown> = {
            tenantId,
            patientId,
            doctorId,
            patientName,
            type: config.type,
            status,
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end),
            startTime: Timestamp.fromDate(start),
            endTime: Timestamp.fromDate(end),
            teamIds: [],
            notes: config.label,
            autoGenerated: true,
            source: 'PATIENT_MILESTONE',
            milestoneType: config.key,
            milestoneLabel: config.label,
            updatedAt: Timestamp.now(),
            createdAt: Timestamp.fromDate(start),
          };

          if (config.type === 'SURGERY') {
            data.depositStatus = 'PENDING';
          }

          await setDoc(appointmentRef, data, { merge: true });
        } else {
          await deleteDoc(appointmentRef);
        }
      })
    );

    await queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] });
  }, [tenantId, patientId, patient, user, queryClient]);

  useEffect(() => {
    if (!patient || !patientId || !tenantId) return;
    const existingMilestones = patient.milestones;
    const hasAnyMilestone = Boolean(
      existingMilestones?.consultDate ||
      existingMilestones?.proposalSentDate ||
      existingMilestones?.surgeryDate ||
      existingMilestones?.followUpDate
    );

    if (hasAnyMilestone || autoFilledMilestones.current) return;

    autoFilledMilestones.current = true;
    const generated = generatePlaceholderMilestones(patient.id);

    (async () => {
      try {
        await updatePatient.mutateAsync({
          patientId,
          data: { milestones: generated },
        });

        setMilestoneForm({
          consultDate: toInputDate(generated.consultDate),
          proposalSentDate: toInputDate(generated.proposalSentDate),
          surgeryDate: toInputDate(generated.surgeryDate),
          followUpDate: toInputDate(generated.followUpDate),
        });

        await syncMilestoneAppointments(generated);
      } catch (error) {
        console.error('Failed to auto-fill milestones', error);
        autoFilledMilestones.current = false;
      }
    })();
  }, [patient, patientId, tenantId, updatePatient, syncMilestoneAppointments]);

  const handleSaveMilestones = async () => {
    if (!patientId) return;
    setIsSavingMilestones(true);

    const payload: PatientMilestones = {
      consultDate: parseInputDate(milestoneForm.consultDate),
      proposalSentDate: parseInputDate(milestoneForm.proposalSentDate),
      surgeryDate: parseInputDate(milestoneForm.surgeryDate),
      followUpDate: parseInputDate(milestoneForm.followUpDate),
    };

    try {
      await updatePatient.mutateAsync({
        patientId,
        data: { milestones: payload },
      });

      await syncMilestoneAppointments(payload);

      setMilestoneForm({
        consultDate: toInputDate(payload.consultDate),
        proposalSentDate: toInputDate(payload.proposalSentDate),
        surgeryDate: toInputDate(payload.surgeryDate),
        followUpDate: toInputDate(payload.followUpDate),
      });

      toast({
        title: 'Milestones Saved',
        description: 'Calendar updated with the latest patient dates.',
      });
      setIsEditingMilestones(false);
    } catch (error) {
      console.error('Failed to save milestones', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save milestone dates.',
      });
    } finally {
      setIsSavingMilestones(false);
    }
  };

  const handleStatusChange = async (newStatus: PatientStatus) => {
    if (!patientId) return;
    try {
      await updatePatient.mutateAsync({
        patientId,
        data: { status: newStatus },
      });
      toast({
        title: 'Status Updated',
        description: 'Patient status has been updated successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update patient status.',
      });
    }
  };

  const handleDelete = async () => {
    if (!patientId) return;
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      await deletePatient.mutateAsync(patientId);
      navigate('/patients');
    } catch (error) {
      console.error('Failed to delete patient:', error);
    }
  };

  const handleDownloadPdf = async () => {
    if (!patient) return;
    try {
      const emailText = `Dear patient,\n\nIt was a pleasure meeting with you at Clinic and thank you for your interest in our advanced Hair Transplant services.\n\nAs discussed during our consultation, you have thinning in the zones A, B and C.\n\nYour donor area has good quality and density, which allows for optimal graft extraction and strong coverage.\n\nWe recommend a Two-Days Session, during which our experienced team will focus on increasing density in both the frontal Gulf, Mid and Back scalp zones so that you may feel confident and style your hair as you wish.\n\nCosting:\n\nThe total price for the session is AED 18,750 (VAT inclusive).\n\nDeposit required upon booking session date: AED 5,000 (Tax Inclusive).\n\nThe remaining balance is due either before or on the day of your session.\n\nPre-op appointment (blood tests): AED 367.50 (Tax Inclusive)\n\nPost medicines: (depends on the prescription)\n\nThe procedure is minimally invasive and performed under local anesthesia. You’ll be able to relax, listen to music, watch TV, and enjoy a light lunch during the session.\n\nAs part of your treatment, we will also include one complimentary PRP (Platelet-Rich Plasma) to support healing and maximize graft survival.\n\nPostoperative Care Plan (3 visits):\n• Day 2: Bandage removal\n• Day 5: Post-op wash and scalp check\n• Day 10: Final post-op shampoo and evaluation\n\nFollow-up evaluations will also be scheduled at 1, 3, 6, and 12 months, free of charge, to monitor your progress and support optimal long-term results.\n\nWhat to Expect:\n• Minimally invasive procedure with no linear scarring\n• Quick recovery with minimal discomfort\n• High graft survival rate using advanced techniques and preservation solutions\n• Natural-looking results through precise control of angle, direction, and density\n\nIf you have any questions or need clarification, please don’t hesitate to get in touch. We are here to ensure you feel informed and supported throughout your journey.\n\nKind regards,\n\nHair Transplant Team.`;

      const galleryImages = patient.afterImageUrls && patient.afterImageUrls.length > 0
        ? patient.afterImageUrls
        : afterImages.length > 0
          ? afterImages
          : patient.afterImageUrl
            ? [patient.afterImageUrl]
            : [];

      const contactLines: string[] = [];
      if (tenant?.emailFrom) contactLines.push(`Email: ${tenant.emailFrom}`);
      if (tenant?.domain) contactLines.push(`Website: ${tenant.domain}`);

      const blob = await generatePatientPdf({
        patientName: `${patient.firstName || 'Patient'} ${patient.lastName || ''}`.trim(),
        emailBody: emailText,
        beforeImageUrl: patient.beforeImageUrl || beforeImage || undefined,
        afterImageUrls: galleryImages,
        clinicName: tenant?.name || 'Clinic',
        clinicTagline: 'Advanced Hair Restoration & Patient Experience',
        clinicLogoUrl: tenant?.logo || tenant?.themeObject?.logoUrl,
        clinicContactLines: contactLines,
        preparedBy: user?.displayName || user?.email || undefined,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Consultation_${patient.firstName || 'patient'}_${patient.lastName || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'PDF generation failed',
        description: 'Please try again or refresh the page.',
      });
    }
  };

  const handleOpenCamera = async () => {
    console.info('[Camera] Opening camera');
    setCameraError(null);
    setIsCameraOpen(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not supported on this device.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      console.info('[Camera] Stream acquired');
      setCameraStream(stream);
    } catch (error) {
      console.error('Failed to open camera:', error);
      setCameraStream(null);
      setCameraError('Unable to access the camera. Please grant permissions or try another device.');
    }
  };

  const handleCloseCamera = () => {
    cameraStream?.getTracks().forEach(track => track.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStream(null);
    setIsCameraOpen(false);
    setCameraError(null);
  };

  const uploadPatientImage = async (type: 'before' | 'after', dataUrl: string) => {
    if (DISABLE_UPLOADS) {
      // Dev mode: skip uploading and just keep local data URL for preview.
      console.info('[Upload] Skipped (DISABLE_UPLOADS=true). Returning data URL for preview only.', { type });
      return dataUrl;
    }
    if (!tenantId || !patientId) {
      throw new Error('Missing tenant or patient context.');
    }

    const timestamp = Date.now();
    const path = `tenants/${tenantId}/patients/${patientId}/media/${type}-${timestamp}.jpg`;
    const imageRef = ref(storage, path);

    try {
      console.time(`[Upload] ${type} -> ${path}`);
      console.info('[Upload] Starting uploadString', { type, path });
      await uploadString(imageRef, dataUrl, 'data_url');
      console.info('[Upload] uploadString OK, fetching download URL');
      const downloadUrl = await getDownloadURL(imageRef);
      console.info('[Upload] getDownloadURL OK', { downloadUrl });

      const updateData = type === 'before' ? { beforeImageUrl: downloadUrl } : { afterImageUrl: downloadUrl };
      console.info('[Upload] Updating patient doc with image URL', { patientId, updateData });
      await updatePatient.mutateAsync({
        patientId,
        data: updateData,
      });
      console.timeEnd(`[Upload] ${type} -> ${path}`);
      return downloadUrl;
    } catch (err) {
      console.error('[Upload] Failed', { type, path, err });
      throw err;
    } finally {
    }
  };

  const ensureDataUrl = async (image: string): Promise<string> => {
    if (image.startsWith('data:')) return image;

    const toDataUrl = async (blob: Blob) =>
      await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Could not read image data.'));
        reader.readAsDataURL(blob);
      });

    try {
      // If we already have a signed download URL with token, fetch it unauthenticated to avoid preflight.
      if (image.startsWith('http')) {
        if (image.includes('token=')) {
          const resp = await fetch(image);
          if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status}).`);
          return await toDataUrl(await resp.blob());
        }

        // Derive the storage path from the URL and then get a signed URL with token.
        const pathSegment = image.split('/o/')[1]?.split('?')[0];
        if (!pathSegment) throw new Error('Stored image path is invalid.');
        const storagePath = decodeURIComponent(pathSegment);
        const storageRef = ref(storage, storagePath);

        try {
          const signedUrl = await getDownloadURL(storageRef);
          const resp = await fetch(signedUrl);
          if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status}).`);
          return await toDataUrl(await resp.blob());
        } catch {
          // Fallback to SDK getBlob (may require bucket CORS if auth header is used)
          const blob = await getBlob(storageRef);
          return await toDataUrl(blob);
        }
      }

      // Unknown format, fail
      throw new Error('Unsupported image reference.');
    } catch (error) {
      console.error('Failed to normalize image:', error);
      const message = error instanceof Error ? error.message : 'Unable to load saved image.';
      toast({
        variant: 'destructive',
        title: 'Image Load Failed',
        description: message,
      });
      throw error;
    }
  };

  const handleCapturePhoto = async () => {
    console.info('[Capture] Attempting to capture photo');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      setCameraError('Camera is not ready.');
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      setCameraError('Camera is still initializing. Please try again.');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('Failed to capture image.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  console.info('[Capture] Data URL created, length:', dataUrl.length);
    setBeforeImage(dataUrl);
    handleCloseCamera();

    toast({
      title: 'Photo Captured',
      description: 'Saving to patient media library...',
    });

    try {
      console.info('[Capture] Uploading before image');
      await uploadPatientImage('before', dataUrl);
      toast({
        title: 'Photo Synced',
        description: 'Before photo stored in patient record.',
      });
    } catch (error) {
      console.error('Failed to upload before photo:', error);
      const message = error instanceof Error ? error.message : 'Could not save photo to storage.';
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: message,
      });
    }

    console.info('[Capture] Triggering AI enhancement');
    await runAiEnhancement(dataUrl);
  };

  const runAiEnhancement = async (base64Image: string) => {
    console.info('[AI] Starting enhancement (4 variants)');
    setIsGenerating(true);

    // Four practical hairstyle variants
    // Always show from short to longer hairstyles in this exact ranking
    const STYLES = [
      { key: 'crew-cut', label: 'Crew Cut' },
      { key: 'textured-crop', label: 'Textured Crop' },
      { key: 'side-part', label: 'Side Part' },
      { key: 'medium-wavy', label: 'Medium Wavy' },
    ];

  const urls: string[] = [];
  const images: string[] = [];
  const labels: string[] = [];

    try {
      for (const style of STYLES) {
        const stylePrompt = `Create a practical post-transplant preview for this patient photo.\n- Preserve the person's facial features, skin tone, and lighting exactly as captured.\n- Add a natural-looking, fuller hair density that matches their likely post-surgery result.\n- Use a ${style.label} hairstyle with realistic texture and clinic-ready presentation.\n- Avoid dramatic styling, facial hair changes, makeup, or accessories.\n- Output should feel like a trustworthy medical simulation for a consultation deck.`;

        const aiImage = await generateEnhancedImage({ baseImage: base64Image, prompt: stylePrompt });
        console.info('[AI] Variant generated:', style.key, 'length:', aiImage.length);
        images.push(aiImage);
        labels.push(style.label);
      }

  setAfterImages(images);
  setAfterImageLabels(labels);

      // Upload all variants, update patient once
      console.info('[AI] Uploading after variants');
      for (let i = 0; i < images.length; i++) {
        try {
          const url = await uploadPatientImage('after', images[i]);
          urls.push(url);
        } catch (e) {
          console.warn('[AI] Upload failed for variant', i, e);
        }
      }

      if (urls.length > 0 && patientId) {
        await updatePatient.mutateAsync({
          patientId,
          data: ({
            afterImageUrl: urls[0], // legacy field
            afterImageUrls: urls, // multi-variant field (extended schema)
            afterImageStyles: labels, // labels in same order (extended schema)
          } as any),
        });
      }

      toast({
        title: 'AI Images Ready',
        description: 'Generated 4 hairstyle variants.',
      });
    } catch (error) {
      console.error('AI generation error:', error);
      const message = error instanceof Error ? error.message : 'Unable to generate AI images.';
      toast({
        variant: 'destructive',
        title: 'AI Generation Failed',
        description: message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAI = async () => {
    console.info('[AI] Manual generate button clicked');
    if (!beforeImage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please capture a before photo first',
      });
      return;
    }
    console.info('[AI] Normalizing before image');
    const normalized = await ensureDataUrl(beforeImage);
    await runAiEnhancement(normalized);
  };

  if (isLoading) return <div className="space-y-6 p-8 animate-pulse"><div className="h-12 bg-muted rounded" /><div className="h-64 bg-muted rounded" /></div>;
  if (!patient) return <div className="flex items-center justify-center h-full"><div className="text-center py-12"><h2 className="text-2xl font-bold">Patient not found</h2><Button onClick={() => navigate('/patients')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" />Back to Patients</Button></div></div>;

  const funnelProgress = patient.funnelStage === 'COMPLETED' ? 100 : patient.funnelStage === 'SCHEDULED' ? 75 : patient.funnelStage === 'PROPOSAL_SENT' ? 60 : patient.funnelStage === 'CONSULTED' ? 40 : 25;

  return (
    <>
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-[520px] space-y-4 p-6 rounded-xl shadow-2xl">
            {cameraError ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-destructive">{cameraError}</p>
                <Button variant="outline" onClick={handleCloseCamera} className="mx-auto">Close</Button>
              </div>
            ) : (
              <>
                <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black aspect-[3/4]" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={handleCloseCamera}>Cancel</Button>
                  <Button onClick={handleCapturePhoto}>Capture</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/patients')} className="glass-card"><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            {isEditingPatientInfo ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={patientForm.firstName}
                    onChange={(e) => handlePatientFieldChange('firstName', e.target.value)}
                    placeholder="First name"
                    className="w-44 glass"
                  />
                  <Input
                    value={patientForm.lastName}
                    onChange={(e) => handlePatientFieldChange('lastName', e.target.value)}
                    placeholder="Last name"
                    className="w-44 glass"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>Patient ID: {patient.id?.substring(0, 8)}...</span>
                  <span>• Lead Source:</span>
                  <Input
                    value={patientForm.leadSource}
                    onChange={(e) => handlePatientFieldChange('leadSource', e.target.value)}
                    placeholder="Lead source"
                    className="w-44 glass"
                  />
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">{patientForm.firstName || patient.firstName} {patientForm.lastName || patient.lastName}</h1>
                <p className="text-muted-foreground">Patient ID: {patient.id?.substring(0, 8)}... • Lead Source: {patientForm.leadSource || 'Direct'}</p>
              </>
            )}
          </div>
          <Select value={patient.status} onValueChange={(value) => handleStatusChange(value as PatientStatus)}>
            <SelectTrigger className="w-40 glass-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="glass-card">
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="capitalize">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
    <div className="flex gap-2">
            {isEditingPatientInfo ? (
              <>
                <Button
                  onClick={handleSavePatientInfo}
                  disabled={updatePatient.isPending}
                  className="neo-button text-foreground disabled:opacity-60"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {updatePatient.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleCancelPatientEdit} className="glass-card text-foreground">
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setIsEditingPatientInfo(true)} className="glass-card">
                <Edit className="mr-2 h-4 w-4" />
                Edit Patient
              </Button>
            )}
            <Button variant="outline" onClick={handleDelete} disabled={deletePatient.isPending} className="glass-card text-destructive hover:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
            <Button onClick={handleDownloadPdf} className="neo-button">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card className="glass-card"><CardContent className="pt-6"><div className="space-y-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground">Email</p>{isEditingPatientInfo ? (<Input value={patientForm.email} onChange={(e) => handlePatientFieldChange('email', e.target.value)} placeholder="Email" className="glass" />) : (<p className="font-medium truncate">{patientForm.email || 'Not provided'}</p>)}</div></div><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Phone className="h-5 w-5 text-primary" /></div><div className="flex-1"><p className="text-xs text-muted-foreground">Phone</p>{isEditingPatientInfo ? (<Input value={patientForm.phone} onChange={(e) => handlePatientFieldChange('phone', e.target.value)} placeholder="Phone" className="glass" />) : (<p className="font-medium">{patientForm.phone || 'Not provided'}</p>)}</div></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><div className="space-y-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><p className="text-xs text-muted-foreground">Location</p>{isEditingPatientInfo ? (<Input value={patientForm.address} onChange={(e) => handlePatientFieldChange('address', e.target.value)} placeholder="Address" className="glass" />) : (<p className="font-medium truncate">{patientForm.address || 'Not provided'}</p>)}</div></div><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><CalendarIcon className="h-5 w-5 text-primary" /></div><div className="flex-1"><p className="text-xs text-muted-foreground">Age & Gender</p>{isEditingPatientInfo ? (<div className="flex flex-wrap gap-2"><Input type="number" value={patientForm.age} onChange={(e) => handlePatientFieldChange('age', e.target.value)} placeholder="Age" className="w-24 glass" /><Select value={patientForm.gender} onValueChange={(value) => handlePatientFieldChange('gender', value)}><SelectTrigger className="w-40 glass"><SelectValue placeholder="Gender" /></SelectTrigger><SelectContent className="glass-card">
                      {GENDER_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent></Select></div>) : (<p className="font-medium">{patientForm.age || '--'} years • {patientForm.gender === 'not-set' ? '--' : patientForm.gender}</p>)}</div></div></div></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6"><div className="space-y-2"><div><p className="text-xs text-muted-foreground">Funnel Progress</p><p className="font-semibold text-sm capitalize mb-2">{patient.funnelStage || 'lead'}</p><Progress value={funnelProgress} /></div><div className="grid grid-cols-2 gap-2 pt-2 text-xs"><div><p className="text-muted-foreground">Created</p><p className="font-medium">{formatDate(patient.createdAt)}</p></div><div><p className="text-muted-foreground">Updated</p><p className="font-medium">{formatDate(patient.updatedAt)}</p></div></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="assessment" className="space-y-6">
        <TabsList className="glass-card">
          <TabsTrigger value="assessment">Assessment & Imaging</TabsTrigger>
          <TabsTrigger value="quotes"><FileText className="mr-2 h-4 w-4" />Quotes</TabsTrigger>
          <TabsTrigger value="appointments"><CalendarIcon className="mr-2 h-4 w-4" />Appointments</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Medical Assessment</CardTitle>
                  <CardDescription>Hair loss evaluation and treatment planning</CardDescription>
                </div>
                <div className="flex gap-2">
                  {isEditingAssessment ? (
                    <>
                      <Button onClick={handleSaveAssessment} size="sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" />Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setIsEditingAssessment(false)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditingAssessment(true)}>
                        <Edit className="mr-2 h-4 w-4" />Edit
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />Export
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(assessmentData).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                    <Input 
                      value={value} 
                      onChange={(e) => handleAssessmentChange(key, e.target.value)}
                      disabled={!isEditingAssessment}
                      className={isEditingAssessment ? 'glass border-primary/50' : 'glass'} 
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Clinical Notes</Label>
                <Textarea 
                  value={medicalNotes} 
                  onChange={(e) => setMedicalNotes(e.target.value)} 
                  disabled={!isEditingAssessment}
                  className={isEditingAssessment ? 'glass border-primary/50' : 'glass'}
                  rows={4} 
                  placeholder="Add clinical notes, observations, patient history..." 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Key Treatment Milestones</CardTitle>
                  <CardDescription>Dates here sync automatically to the shared calendar</CardDescription>
                </div>
                <div className="flex gap-2">
                  {isEditingMilestones ? (
                    <>
                      <Button size="sm" onClick={handleSaveMilestones} disabled={isSavingMilestones}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSavingMilestones ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleCancelMilestones} disabled={isSavingMilestones}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setIsEditingMilestones(true)}>
                      <Edit className="mr-2 h-4 w-4" />Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditingMilestones ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {MILESTONE_CONFIGS.map((config) => (
                    <div key={config.key} className="space-y-2">
                      <Label className="text-xs text-muted-foreground">{config.label}</Label>
                      <Input
                        type="date"
                        value={milestoneForm[config.key]}
                        onChange={(e) => handleMilestoneFieldChange(config.key, e.target.value)}
                        disabled={isSavingMilestones}
                        className="glass"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {MILESTONE_CONFIGS.map((config) => (
                    <div key={config.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{config.label}</p>
                      <p className="mt-1 text-sm font-semibold">
                        {milestoneForm[config.key] ? formatDate(milestoneForm[config.key]) : 'Not scheduled'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Updates are pushed to the calendar and patient timeline automatically.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
            <Card className="glass-card lg:col-span-1">
              <CardHeader className="pb-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Camera className="h-5 w-5" />Before Image</CardTitle><CardDescription className="text-sm">Front pose • current condition</CardDescription></div></CardHeader>
              <CardContent className="pt-0">
                <div className="group relative flex min-h-[260px] w-full items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background shadow-[0_12px_32px_-18px_rgba(15,23,42,0.38)]">
                  {beforeImage ? (
                    <>
                      <img
                        src={beforeImage}
                        alt="Before"
                        className="block h-auto max-h-[440px] w-full max-w-full cursor-zoom-in object-contain"
                        onClick={() => afterImages.length > 0 && openLightboxAt(0)}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center gap-2 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
                        <button
                          type="button"
                          onClick={handleOpenCamera}
                          className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-white"
                        >
                          <Camera className="h-3.5 w-3.5" /> Retake
                        </button>
                        {afterImages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openLightboxAt(0)}
                            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-white"
                          >
                            View Fullscreen
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-primary/30 bg-primary/5 text-muted-foreground transition-colors hover:border-primary/70 hover:bg-primary/10"
                    >
                      <Camera className="mb-4 h-14 w-14 opacity-60" />
                      <p className="text-sm">Tap to capture photo</p>
                      <p className="text-xs opacity-70">Front pose only</p>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card lg:col-span-2">
              <CardHeader className="pb-3"><div><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-primary" />After Images (AI Simulation)</CardTitle><CardDescription className="text-sm">Four hairstyle variants</CardDescription></div></CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {afterImages.length > 0 ? (
                    afterImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openLightboxAt(idx)}
                        className="group relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-border/70 bg-background/90 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_16px_36px_-18px_rgba(16,185,129,0.55)] focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <img src={img} alt={`After AI ${idx + 1}`} className="h-full w-full object-cover object-center" />
                        <Badge className="absolute bottom-3 right-3 bg-white/90 text-foreground shadow-sm">
                          {afterImageLabels[idx] || `Variant ${idx + 1}`}
                        </Badge>
                      </button>
                    ))
                  ) : (
                    <div className="col-span-2 flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/40 text-muted-foreground">
                      {isGenerating ? (
                        <>
                          <div className="mb-4 h-14 w-14 animate-spin rounded-full border-4 border-primary/60 border-t-transparent"></div>
                          <p className="text-sm">Generating AI results...</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="mb-4 h-12 w-12 opacity-60" />
                          <p className="text-sm mb-1">AI images not generated yet</p>
                          <p className="text-xs opacity-70">Capture the before photo first</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <Button onClick={handleGenerateAI} disabled={!beforeImage || isGenerating} className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : afterImages.length ? 'Regenerate 4 AI Results' : 'Generate 4 AI Results'}
                </Button>
                {afterImages.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />Use these variants in proposals and PDF exports
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="p-4 glass rounded-lg border-l-4 border-primary"><p className="text-sm text-muted-foreground"><AlertCircle className="inline h-4 w-4 mr-2" /><strong>Workflow:</strong> Capture the patient's front pose photo → Generate AI results → Use both images in quotes and proposals → Generate PDF for patient review</p></div>
        </TabsContent>

        <TabsContent value="quotes" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Quotes & Proposals</CardTitle>
                  {quotes.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} for this patient
                    </p>
                  )}
                </div>
                {!isAddingQuote && (
                  <Button onClick={() => setIsAddingQuote(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Quote
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Loading State */}
              {quotesLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading quotes...</p>
                </div>
              )}
              
              {/* New Quote Form - Excel Style */}
              {!quotesLoading && isAddingQuote && (
                <div className="p-4 glass rounded-lg border-2 border-primary space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">New Quote</h3>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setIsAddingQuote(false);
                      setNewQuoteItems([{ zone: '', graftCount: 0, unitPrice: 0 }]);
                    }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Excel-style Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 text-sm font-semibold">Zone</th>
                          <th className="text-left p-2 text-sm font-semibold">Grafts</th>
                          <th className="text-left p-2 text-sm font-semibold">Price/Graft</th>
                          <th className="text-left p-2 text-sm font-semibold">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newQuoteItems.map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">
                              <select
                                value={item.zone}
                                onChange={(e) => {
                                  const updated = [...newQuoteItems];
                                  updated[index].zone = e.target.value;
                                  setNewQuoteItems(updated);
                                }}
                                className="w-full px-2 py-1 rounded border bg-background"
                              >
                                <option value="">Select zone</option>
                                <option value="Hairline">Hairline</option>
                                <option value="Front">Front</option>
                                <option value="Mid-Scalp">Mid-Scalp</option>
                                <option value="Crown">Crown</option>
                                <option value="Temples">Temples</option>
                                <option value="Vertex">Vertex</option>
                                <option value="Beard">Beard</option>
                                <option value="Eyebrows">Eyebrows</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={item.graftCount || ''}
                                onChange={(e) => {
                                  const updated = [...newQuoteItems];
                                  updated[index].graftCount = parseInt(e.target.value) || 0;
                                  setNewQuoteItems(updated);
                                }}
                                className="w-24"
                                placeholder="1500"
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.unitPrice || ''}
                                onChange={(e) => {
                                  const updated = [...newQuoteItems];
                                  updated[index].unitPrice = parseFloat(e.target.value) || 0;
                                  setNewQuoteItems(updated);
                                }}
                                className="w-24"
                                placeholder="3.50"
                              />
                            </td>
                            <td className="p-2 font-semibold">
                              ${(item.graftCount * item.unitPrice).toFixed(2)}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (newQuoteItems.length > 1) {
                                    setNewQuoteItems(newQuoteItems.filter((_, i) => i !== index));
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="p-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setNewQuoteItems([...newQuoteItems, { zone: '', graftCount: 0, unitPrice: 0 }])}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Row
                            </Button>
                          </td>
                        </tr>
                        <tr className="border-t-2">
                          <td colSpan={3} className="p-2 text-right font-bold">TOTAL:</td>
                          <td className="p-2 font-bold text-lg text-primary">
                            ${newQuoteItems.reduce((sum, item) => sum + (item.graftCount * item.unitPrice), 0).toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddingQuote(false);
                        setNewQuoteItems([{ zone: '', graftCount: 0, unitPrice: 0 }]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!patientId || !tenantId || !user) {
                          console.error('[Quote Creation] Missing required data:', { patientId, tenantId, user: !!user });
                          return;
                        }
                        
                        console.log('[Quote Creation] Creating quote for patient:', patientId);
                        
                        const validItems = newQuoteItems.filter(item => item.zone && item.graftCount > 0);
                        if (validItems.length === 0) {
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: 'Please add at least one valid zone',
                          });
                          return;
                        }

                        const subtotal = validItems.reduce((sum, item) => sum + (item.graftCount * item.unitPrice), 0);
                        
                        const quoteData = {
                          tenantId,
                          patientId,
                          doctorId: user.uid,
                          items: validItems.map(item => ({
                            ...item,
                            total: item.graftCount * item.unitPrice,
                          })),
                          status: 'DRAFT' as const,
                          version: 1,
                          subtotal,
                          tax: 0,
                          discount: 0,
                          total: subtotal,
                          currency: 'USD',
                          validity: 30,
                        };
                        
                        console.log('[Quote Creation] Quote data to save:', quoteData);
                        
                        try {
                          const result = await createQuote.mutateAsync(quoteData);
                          
                          console.log('[Quote Creation] Quote created successfully:', result);

                          toast({
                            title: 'Quote created',
                            description: 'Quote has been created successfully.',
                          });

                          // Refetch quotes to show the new quote
                          console.log('[Quote Creation] Refetching quotes for patient:', patientId);
                          await refetchQuotes();
                          
                          setIsAddingQuote(false);
                          setNewQuoteItems([{ zone: '', graftCount: 0, unitPrice: 0 }]);
                        } catch (error) {
                          console.error('[Quote Creation] Error creating quote:', error);
                          toast({
                            variant: 'destructive',
                            title: 'Error',
                            description: 'Failed to create quote',
                          });
                        }
                      }}
                      disabled={createQuote.isPending}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {createQuote.isPending ? 'Saving...' : 'Save Quote'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing Quotes List */}
              {!quotesLoading && quotes.length > 0 ? (
                <div className="space-y-3">
                  {quotes.map((quote) => {
                    const totalGrafts = quote.items.reduce((sum, item) => sum + item.graftCount, 0);
                    return (
                      <div key={quote.id} className="p-4 glass rounded-lg flex items-center justify-between hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer" onClick={() => navigate(`/quotes/${quote.id}`)}>
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">Quote #{quote.id.substring(0, 8)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(quote.createdAt)} • {totalGrafts} grafts</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg">{formatCurrency(quote.total, quote.currency)}</p>
                            <Badge variant={quote.status === 'VIEWED' ? 'default' : 'secondary'}>
                              {quote.status === 'VIEWED' ? <Eye className="h-3 w-3 mr-1" /> : null}
                              {quote.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm" className="glass-card" onClick={(e) => { e.stopPropagation(); navigate(`/quotes/${quote.id}`); }}>View</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !quotesLoading && !isAddingQuote ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No quotes created yet</p>
                  <Button onClick={() => setIsAddingQuote(true)} className="mt-4">Create First Quote</Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card className="glass-card">
            <CardHeader><div className="flex items-center justify-between"><CardTitle>Appointments & Surgery Schedule</CardTitle><Button onClick={() => navigate('/calendar')}><CalendarIcon className="mr-2 h-4 w-4" />Schedule Appointment</Button></div></CardHeader>
            <CardContent>
              {appointments.filter(apt => apt.patientId === patientId).length > 0 ? (
                <div className="space-y-3">{appointments.filter(apt => apt.patientId === patientId).map((apt) => (
                  <div key={apt.id} className="p-4 glass rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${apt.type === 'SURGERY' ? 'bg-primary/10' : 'bg-blue-500/10'}`}>
                        <CalendarIcon className={`h-5 w-5 ${apt.type === 'SURGERY' ? 'text-primary' : 'text-blue-500'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">{apt.milestoneLabel || apt.type} {apt.doctorName ? `with ${apt.doctorName}` : ''}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(apt.startTime ?? apt.start)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={apt.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                        {apt.status === 'CONFIRMED' ? <CheckCircle2 className="h-3 w-3 mr-1" /> : apt.status === 'HOLD' ? <Clock className="h-3 w-3 mr-1" /> : null}
                        {apt.status}
                      </Badge>
                      <Button variant="outline" size="sm" className="glass-card" onClick={() => navigate('/calendar')}>Details</Button>
                    </div>
                  </div>
                ))}</div>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No appointments scheduled</p><Button onClick={() => navigate('/calendar')} className="mt-4">Schedule First Appointment</Button></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="glass-card">
            <CardHeader><CardTitle>Patient Journey Timeline</CardTitle><CardDescription>Complete history of interactions and milestones</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { date: formatDateTime(patient.createdAt), event: 'Patient Created', icon: CheckCircle2, color: 'text-green-500' },
                  ...quotes.map(q => ({ 
                    date: formatDateTime(q.createdAt), 
                    event: `Quote Created - ${formatCurrency(q.total, q.currency)}`, 
                    icon: FileText, 
                    color: 'text-blue-500' 
                  })),
                  ...appointments.filter(apt => apt.patientId === patientId).map(apt => ({
                    date: formatDateTime(apt.startTime ?? apt.start),
                    event: apt.milestoneLabel || `${apt.type} Scheduled`,
                    icon: CalendarIcon,
                    color: 'text-primary'
                  })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map((item, idx, arr) => (
                  <div key={idx} className="flex gap-4"><div className="flex flex-col items-center"><div className={`p-2 rounded-full bg-muted ${item.color}`}><item.icon className="h-4 w-4" /></div>{idx < arr.length - 1 && <div className="w-0.5 h-12 bg-border mt-2" />}</div><div className="flex-1 pb-6"><p className="font-semibold">{item.event}</p><p className="text-sm text-muted-foreground">{item.date}</p></div></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>

    {/* Fullscreen Lightbox Compare View */}
    {isLightboxOpen && (
      <div className="fixed inset-0 z-[60] bg-black overflow-hidden">
        {/* Close button - safe area aware */}
        <div className="absolute top-0 right-0 z-[70]" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <button
            aria-label="Close"
            className="m-3 md:m-6 inline-flex items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg p-2 hover:bg-white"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content: Two columns - Before (left) static, After (right) with navigation */}
        <div className="h-svh w-full p-3 md:p-6 box-border">
                  <div className="grid grid-cols-2 h-full w-full gap-3 md:gap-6">
            {/* Left: Before card */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden ring-2 ring-[hsl(var(--brand)/0.35)] shadow-[0_0_40px_hsl(var(--brand)/0.25)] bg-black">
              {beforeImage ? (
                <img src={beforeImage} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/70">No before image</div>
              )}
              <div className="absolute top-3 left-3 md:top-4 md:left-4 backdrop-blur bg-white/80 text-foreground rounded px-2 py-1 text-[10px] md:text-xs font-semibold shadow">
                Before
              </div>
            </div>

            {/* Right: After card + navigation */}
            <div className="relative h-full w-full rounded-2xl overflow-hidden ring-2 ring-[hsl(var(--brand)/0.35)] shadow-[0_0_40px_hsl(var(--brand)/0.25)] bg-black">
              {afterImages.length > 0 ? (
                <>
                  <img
                    src={afterImages[lightboxIndex]}
                    alt={afterImageLabels[lightboxIndex] || `After ${lightboxIndex + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 md:top-4 md:left-4 backdrop-blur bg-white/80 text-foreground rounded px-2 py-1 text-[10px] md:text-xs font-semibold shadow">
                    After{afterImageLabels[lightboxIndex] ? ` — ${afterImageLabels[lightboxIndex]}` : ''}
                  </div>
                  <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white rounded px-2 py-1 text-[10px] md:text-xs shadow">
                    {lightboxIndex + 1} / {afterImages.length}
                  </div>

                  {/* Clickable halves for prev/next */}
                  <button
                    aria-label="Previous"
                    className="absolute inset-y-0 left-0 w-1/2 cursor-w-resize focus:outline-none"
                    onClick={() => setLightboxIndex((i) => (i - 1 + afterImages.length) % afterImages.length)}
                    title="Previous"
                  />
                  <button
                    aria-label="Next"
                    className="absolute inset-y-0 right-0 w-1/2 cursor-e-resize focus:outline-none"
                    onClick={() => setLightboxIndex((i) => (i + 1) % afterImages.length)}
                    title="Next"
                  />

                  {/* Visible Prev/Next controls */}
                  <button
                    aria-label="Previous"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-[70] inline-flex items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg p-2 hover:bg-white"
                    onClick={() => setLightboxIndex((i) => (i - 1 + afterImages.length) % afterImages.length)}
                    title="Previous"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    aria-label="Next"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-[70] inline-flex items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg p-2 hover:bg-white"
                    onClick={() => setLightboxIndex((i) => (i + 1) % afterImages.length)}
                    title="Next"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/70">No after images</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
