import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useAppointments, useDoctors } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AppointmentModal } from '@/components/calendar/AppointmentModal';
import { CalendarDayView } from '@/components/calendar/CalendarDayView';
import { CalendarWeekView } from '@/components/calendar/CalendarWeekView';
import { CalendarMonthView } from '@/components/calendar/CalendarMonthView';
import type { Appointment } from '@/types';

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [defaultModalDate, setDefaultModalDate] = useState<Date | undefined>(undefined);

  const { data: appointments = [], isLoading } = useAppointments();
  const { data: doctors = [] } = useDoctors();

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (selectedDoctor !== 'all' && apt.doctorId !== selectedDoctor) return false;
      if (selectedType !== 'all' && apt.type !== selectedType) return false;
      if (selectedStatus !== 'all' && apt.status !== selectedStatus) return false;
      return true;
    });
  }, [appointments, selectedDoctor, selectedType, selectedStatus]);

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(subDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Appointment handlers
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDefaultModalDate(undefined);
    setIsModalOpen(true);
  };

  const handleTimeSlotClick = (date: Date) => {
    setSelectedAppointment(null);
    setDefaultModalDate(date);
    setIsModalOpen(true);
  };

  const handleDateClick = (date: Date) => {
    if (viewMode === 'month') {
      setCurrentDate(date);
      setViewMode('day');
    } else {
      handleTimeSlotClick(date);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setDefaultModalDate(undefined);
  };

  const handleNewAppointment = () => {
    setSelectedAppointment(null);
    setDefaultModalDate(currentDate);
    setIsModalOpen(true);
  };

  // Format date range display
  const getDateRangeText = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEEE, MMMM d, yyyy');
    } else {
      return format(currentDate, 'MMMM yyyy');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const todayAppointments = filteredAppointments.filter(
      (apt) => format(apt.start, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );

    return {
      total: filteredAppointments.length,
      today: todayAppointments.length,
      holds: filteredAppointments.filter((apt) => apt.status === 'HOLD').length,
      confirmed: filteredAppointments.filter((apt) => apt.status === 'CONFIRMED').length,
    };
  }, [filteredAppointments]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Calendar</h1>
            <p className="text-muted-foreground mt-1">Schedule and manage appointments</p>
          </div>
          <Button onClick={handleNewAppointment} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            New Appointment
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today</p>
                  <p className="text-2xl font-bold">{stats.today}</p>
                </div>
                <CalendarIcon className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">On Hold</p>
                  <p className="text-2xl font-bold">{stats.holds}</p>
                </div>
                <Badge className="bg-yellow-500/10 text-yellow-600">HOLD</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                </div>
                <Badge className="bg-green-500/10 text-green-600">CONFIRMED</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="ml-2 font-semibold text-sm">{getDateRangeText()}</div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="h-4 w-4 text-muted-foreground" />

            {/* Doctor Filter */}
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Doctors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doctors</SelectItem>
                {doctors.map((doctor: any) => (
                  <SelectItem key={doctor.id} value={doctor.userId}>
                    Dr. {doctor.userId.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CONSULT">Consult</SelectItem>
                <SelectItem value="SURGERY">Surgery</SelectItem>
                <SelectItem value="FOLLOWUP">Follow-up</SelectItem>
                <SelectItem value="PROPOSAL">Proposal</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="HOLD">Hold</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="NO_SHOW">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full m-6 mt-0 glass-card">
          <CardContent className="p-0 h-full flex flex-col">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CalendarIcon className="h-12 w-12 animate-pulse text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading calendar...</p>
                </div>
              </div>
            ) : (
              <>
                {viewMode === 'day' && (
                  <CalendarDayView
                    date={currentDate}
                    appointments={filteredAppointments}
                    onAppointmentClick={handleAppointmentClick}
                    onTimeSlotClick={handleTimeSlotClick}
                  />
                )}
                {viewMode === 'week' && (
                  <CalendarWeekView
                    date={currentDate}
                    appointments={filteredAppointments}
                    onAppointmentClick={handleAppointmentClick}
                    onTimeSlotClick={handleTimeSlotClick}
                  />
                )}
                {viewMode === 'month' && (
                  <CalendarMonthView
                    date={currentDate}
                    appointments={filteredAppointments}
                    onAppointmentClick={handleAppointmentClick}
                    onDateClick={handleDateClick}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        appointment={selectedAppointment}
        defaultDate={defaultModalDate}
      />
    </div>
  );
}
