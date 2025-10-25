import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
} from 'date-fns';
import { Card } from '@/components/ui/card';
import type { Appointment } from '@/types';

interface CalendarMonthViewProps {
  date: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateClick: (date: Date) => void;
}

const statusColors = {
  HOLD: 'bg-yellow-500',
  CONFIRMED: 'bg-green-500',
  COMPLETED: 'bg-blue-500',
  CANCELLED: 'bg-gray-500',
  NO_SHOW: 'bg-red-500',
};

const typeIcons = {
  CONSULT: '📋',
  SURGERY: '🏥',
  FOLLOWUP: '✓',
  PROPOSAL: '📄',
} as const;

export function CalendarMonthView({
  date,
  appointments,
  onAppointmentClick,
  onDateClick,
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => isSameDay(apt.start, day));
  };

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-[800px]">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
            <div
              key={weekday}
              className="p-3 text-center text-sm font-semibold text-muted-foreground border-r border-border/50 last:border-r-0"
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border/50 last:border-b-0">
            {week.map((day) => {
              const dayAppointments = getAppointmentsForDay(day);
              const isCurrentMonth = isSameMonth(day, date);
              const isToday = isSameDay(day, new Date());

              return (
                <Card
                  key={day.toISOString()}
                  className={`rounded-none border-0 border-r border-border/50 last:border-r-0 min-h-[120px] p-2 cursor-pointer hover:bg-muted/30 transition-colors ${
                    !isCurrentMonth ? 'bg-muted/10' : ''
                  } ${isToday ? 'bg-primary/5' : ''}`}
                  onClick={() => onDateClick(day)}
                >
                  <div
                    className={`text-sm font-semibold mb-2 ${
                      isToday
                        ? 'text-primary'
                        : isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((apt) => (
                      <div
                        key={apt.id}
                        className={`text-xs px-2 py-1 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                          statusColors[apt.status]
                        } text-white truncate`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(apt);
                        }}
                      >
                        <span className="mr-1">{typeIcons[apt.type] ?? '•'}</span>
                        {apt.milestoneLabel ? `${apt.milestoneLabel} · ${format(apt.start, 'h:mm a')}` : format(apt.start, 'h:mm a')}
                      </div>
                    ))}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-muted-foreground px-2">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
