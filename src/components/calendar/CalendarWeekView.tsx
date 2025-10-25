import {
  format,
  startOfWeek,
  addDays,
  addHours,
  startOfDay,
  isSameDay,
  isSameHour,
} from 'date-fns';
import { Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Appointment } from '@/types';

interface CalendarWeekViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM
const DAYS = 7;

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

export function CalendarWeekView({
  date,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });

  const getAppointmentsForDayHour = (dayIndex: number, hour: number) => {
    const day = addDays(weekStart, dayIndex);
    const hourStart = addHours(startOfDay(day), hour);

    return appointments.filter((apt) => {
      return isSameDay(apt.start, day) && isSameHour(apt.start, hourStart);
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[1200px]">
        {/* Week Header */}
        <div className="flex border-b border-border sticky top-0 bg-background z-10">
          <div className="w-20 flex-shrink-0 border-r border-border/50" />
          {Array.from({ length: DAYS }).map((_, dayIndex) => {
            const day = addDays(weekStart, dayIndex);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dayIndex}
                className={`flex-1 p-3 text-center border-r border-border/50 ${
                  isToday ? 'bg-primary/5' : ''
                }`}
              >
                <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
                <div
                  className={`text-lg font-semibold mt-1 ${
                    isToday ? 'text-primary' : ''
                  }`}
                >
                  {format(day, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time Grid */}
        {HOURS.map((hour) => {
          const hourDate = addHours(startOfDay(weekStart), hour);

          return (
            <div key={hour} className="flex border-b border-border/50">
              {/* Time Label */}
              <div className="w-20 flex-shrink-0 p-3 text-sm text-muted-foreground font-medium border-r border-border/50">
                {format(hourDate, 'h a')}
              </div>

              {/* Day Columns */}
              {Array.from({ length: DAYS }).map((_, dayIndex) => {
                const day = addDays(weekStart, dayIndex);
                const slotDate = addHours(startOfDay(day), hour);
                const dayHourAppointments = getAppointmentsForDayHour(dayIndex, hour);

                return (
                  <div
                    key={dayIndex}
                    className="flex-1 p-1 min-h-[60px] border-r border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => onTimeSlotClick(slotDate)}
                  >
                    {dayHourAppointments.length > 0 ? (
                      <div className="space-y-1">
                        {dayHourAppointments.map((apt) => (
                          <Card
                            key={apt.id}
                            className={`p-2 cursor-pointer hover:shadow-md transition-all text-xs border-l-2 ${
                              typeColors[apt.type]
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick(apt);
                            }}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-[10px] text-muted-foreground truncate">
                                {format(apt.start, 'h:mm')}
                              </span>
                            </div>
                            <p className="font-semibold text-xs truncate">
                              {apt.milestoneLabel || apt.type}
                            </p>
                            <Badge
                              className={`${statusColors[apt.status]} text-[9px] px-1 py-0 mt-1`}
                              variant="outline"
                            >
                              {apt.status}
                            </Badge>
                          </Card>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
