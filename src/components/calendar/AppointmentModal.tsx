import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useCreateAppointment, useUpdateAppointment, useDoctors } from '@/hooks/useAppointments';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/types';

const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  type: z.enum(['CONSULT', 'SURGERY', 'FOLLOWUP', 'PROPOSAL']),
  status: z.enum(['HOLD', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  startDate: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.coerce.number().min(15, 'Duration must be at least 15 minutes'),
  roomId: z.string().optional(),
  notes: z.string().optional(),
});

type AppointmentFormData = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultPatientId?: string;
}

export function AppointmentModal({
  isOpen,
  onClose,
  appointment,
  defaultDate,
  defaultPatientId,
}: AppointmentModalProps) {
  const { toast } = useToast();
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      type: 'CONSULT',
      status: 'HOLD',
      duration: 60,
      startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      startTime: defaultDate ? format(defaultDate, 'HH:mm') : '09:00',
      patientId: defaultPatientId || '',
    },
  });

  const type = watch('type');

  // Auto-adjust duration based on type
  useEffect(() => {
    if (type === 'CONSULT') {
      setValue('duration', 60);
    } else if (type === 'SURGERY') {
      setValue('duration', 240);
    } else if (type === 'FOLLOWUP') {
      setValue('duration', 30);
    } else if (type === 'PROPOSAL') {
      setValue('duration', 30);
    }
  }, [type, setValue]);

  // Reset form when modal opens with appointment data
  useEffect(() => {
    if (appointment) {
      reset({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        type: appointment.type,
        status: appointment.status,
        startDate: format(appointment.start, 'yyyy-MM-dd'),
        startTime: format(appointment.start, 'HH:mm'),
        duration: Math.round((appointment.end.getTime() - appointment.start.getTime()) / (1000 * 60)),
        roomId: appointment.roomId || '',
        notes: appointment.notes || '',
      });
    } else {
      reset({
        type: 'CONSULT',
        status: 'HOLD',
        duration: 60,
        startDate: defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: defaultDate ? format(defaultDate, 'HH:mm') : '09:00',
        patientId: defaultPatientId || '',
        doctorId: '',
        notes: '',
      });
    }
  }, [appointment, defaultDate, defaultPatientId, reset]);

  const onSubmit = async (data: AppointmentFormData) => {
    try {
      const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + data.duration * 60 * 1000);

      const appointmentData = {
        patientId: data.patientId,
        doctorId: data.doctorId,
        type: data.type,
        status: data.status,
        start: startDateTime,
        end: endDateTime,
        roomId: data.roomId || undefined,
        teamIds: [],
        notes: data.notes,
        holdExpiresAt: data.status === 'HOLD' ? new Date(Date.now() + 24 * 60 * 60 * 1000) : undefined,
      };

      if (appointment) {
        await updateAppointment.mutateAsync({
          id: appointment.id,
          data: appointmentData,
        });
        toast({
          title: 'Success',
          description: 'Appointment updated successfully',
        });
      } else {
        await createAppointment.mutateAsync(appointmentData as any);
        toast({
          title: 'Success',
          description: 'Appointment created successfully',
        });
      }

      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to save appointment',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {appointment ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
          <DialogDescription>
            {appointment ? 'Update appointment details' : 'Schedule a new appointment with conflict detection'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Selection */}
            <div className="space-y-2">
              <Label htmlFor="patientId">
                Patient <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('patientId')}
                onValueChange={(value) => setValue('patientId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.patientId && (
                <p className="text-sm text-destructive">{errors.patientId.message}</p>
              )}
            </div>

            {/* Doctor Selection */}
            <div className="space-y-2">
              <Label htmlFor="doctorId">
                Doctor <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watch('doctorId')}
                onValueChange={(value) => setValue('doctorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors?.map((doctor: any) => (
                    <SelectItem key={doctor.id} value={doctor.userId}>
                      Dr. {doctor.userId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.doctorId && (
                <p className="text-sm text-destructive">{errors.doctorId.message}</p>
              )}
            </div>

            {/* Appointment Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={watch('type')} onValueChange={(value: any) => setValue('type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONSULT">Consultation (60 min)</SelectItem>
                  <SelectItem value="SURGERY">Surgery (4 hours)</SelectItem>
                  <SelectItem value="FOLLOWUP">Follow-up (30 min)</SelectItem>
                  <SelectItem value="PROPOSAL">Proposal Milestone (30 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={watch('status')} onValueChange={(value: any) => setValue('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOLD">Hold (24h)</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input type="date" {...register('startDate')} />
              {errors.startDate && (
                <p className="text-sm text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            {/* Time */}
            <div className="space-y-2">
              <Label htmlFor="startTime">
                Start Time <span className="text-destructive">*</span>
              </Label>
              <Input type="time" {...register('startTime')} />
              {errors.startTime && (
                <p className="text-sm text-destructive">{errors.startTime.message}</p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input type="number" step="15" {...register('duration')} />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label htmlFor="roomId">Room (Optional)</Label>
              <Input placeholder="e.g., Room 101" {...register('roomId')} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              placeholder="Additional details, special requirements, etc."
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : appointment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
