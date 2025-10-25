import { format, startOfDay, addHours, isSameHour } from 'date-fns';
import { Clock, User, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/types';

interface CalendarDayViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

const statusColors = {
  HOLD: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
  CONFIRMED: 'bg-green-500/10 text-green-600 border-green-500/30',
  COMPLETED: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  CANCELLED: 'bg-gray-500/10 text-gray-600 border-gray-500/30',
  NO_SHOW: 'bg-red-500/10 text-red-600 border-red-500/30',
};

const typeColors = {
  CONSULT: 'border-l-blue-500',
  SURGERY: 'border-l-primary',
  FOLLOWUP: 'border-l-purple-500',
  PROPOSAL: 'border-l-amber-500',
} as const;

export function CalendarDayView({
  date,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
}: CalendarDayViewProps) {
  const dayStart = startOfDay(date);

  const getAppointmentsForHour = (hour: number) => {
    const hourStart = addHours(dayStart, hour);
    return appointments.filter((apt) => {
      return isSameHour(apt.start, hourStart);
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[600px]">
        {/* Time Grid */}
        {HOURS.map((hour) => {
          const hourAppointments = getAppointmentsForHour(hour);
          const hourDate = addHours(dayStart, hour);

          return (
            <div
              key={hour}
              className="flex border-b border-border/50 hover:bg-muted/30 transition-colors"
            >
              {/* Time Label */}
              <div className="w-20 flex-shrink-0 p-3 text-sm text-muted-foreground font-medium border-r border-border/50">
                {format(hourDate, 'h:mm a')}
              </div>

              {/* Appointment Slot */}
              <div
                className="flex-1 p-2 min-h-[80px] cursor-pointer"
                onClick={() => onTimeSlotClick(hourDate)}
              >
                {hourAppointments.length > 0 ? (
                  <div className="space-y-2">
                    {hourAppointments.map((apt) => (
                      <Card
                        key={apt.id}
                        className={`p-3 cursor-pointer hover:shadow-md transition-all border-l-4 ${
                          typeColors[apt.type]
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {format(apt.start, 'h:mm a')} - {format(apt.end, 'h:mm a')}
                              </span>
                            </div>
                            <p className="font-semibold text-sm truncate">
                              {apt.milestoneLabel || `${apt.type} Appointment`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                Patient ID: {apt.patientId.slice(0, 8)}...
                              </span>
                            </div>
                            {apt.roomId && (
                              <div className="flex items-center gap-2 mt-1">
                                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground">{apt.roomId}</span>
                              </div>
                            )}
                          </div>
                          <Badge className={statusColors[apt.status]} variant="outline">
                            {apt.status}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground/40 text-xs">
                    Click to schedule
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
