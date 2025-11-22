import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, Phone, MapPin, MoreVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { apiUrl } from '@/config';

export function AppointmentsPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date(2025, 10, 17)); // Nov 17, 2025

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/appointments'));
      if (!res.ok) {
        console.error('Failed to fetch appointments');
        setAppointments([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      // Normalize backend response with proper date/time extraction
      const list = (data || []).map((appt: any) => {
        // Parse datetime string directly from ISO format (e.g., "2025-11-20T09:00:00Z")
        // Extract date and time without timezone conversion
        const parts = appt.datetime.split('T');
        const dateStr = parts[0]; // YYYY-MM-DD
        const timeStr = parts[1]; // HH:MM:SSZ
        const timeOnly = timeStr.split(':').slice(0, 2).join(':'); // HH:MM
        
        // Convert 24-hour to 12-hour format
        const [hoursStr, minutesStr] = timeOnly.split(':');
        const hours = parseInt(hoursStr);
        const minutes = minutesStr;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedTime = `${displayHours}:${minutes} ${ampm}`;
        
        return {
          id: appt.id || appt._id || Math.random(),
          client: appt.client || '',
          doctor: appt.doctor || 'Dr. TBD',
          datetime: appt.datetime, // Keep full ISO datetime
          date: dateStr, // YYYY-MM-DD format
          time: formattedTime, // Matches calendar time slots exactly
          duration: appt.duration || 60,
          purpose: appt.purpose || 'Session',
          type: 'video',
          status: appt.status || 'confirmed',
          image: '',
        };
      });
      setAppointments(list);
      console.log('Appointments fetched:', list);
    } catch (err) {
      console.error('Error fetching appointments', err);
      setAppointments([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();

    const handler = () => fetchAppointments();
    window.addEventListener('appointment:created', handler as EventListener);
    return () => window.removeEventListener('appointment:created', handler as EventListener);
  }, []);

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];

  // Get week start and end dates for display
  const weekStart = currentWeekStart;
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekDisplayText = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${weekEnd.getFullYear()}`;

  // Helper to check if appointment is in current week and matches day/time
  const getAppointmentsForDayAndTime = (dayIndex: number, timeSlot: string) => {
    const targetDate = new Date(weekStart);
    targetDate.setDate(targetDate.getDate() + dayIndex);
    
    // Format target date as YYYY-MM-DD using local date
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    const targetDateStr = `${year}-${month}-${day}`;

    return appointments.filter((appt) => {
      // Check if appointment date matches the target date
      if (appt.date !== targetDateStr) return false;
      // Check if appointment time matches the time slot
      return appt.time === timeSlot;
    });
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">Appointments</h1>
          <p className="text-slate-600 mt-1">Manage your schedule and upcoming sessions</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all">
          <Plus className="w-4 h-4" />
          Schedule Appointment
        </button>
      </div>

      <Card className="border-slate-200 rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="text-slate-900">{weekDisplayText}</div>
                <button 
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <button className="px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors">
                Today
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === 'day'
                    ? 'bg-cyan-50 text-cyan-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === 'week'
                    ? 'bg-cyan-50 text-cyan-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  viewMode === 'month'
                    ? 'bg-cyan-50 text-cyan-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Month
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Week View Calendar Grid */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {/* Header Row */}
            <div className="grid grid-cols-8 bg-slate-50 border-b border-slate-200">
              <div className="p-3 text-xs text-slate-500">Time</div>
              {weekDays.map((day, dayIndex) => {
                const cellDate = new Date(weekStart);
                cellDate.setDate(cellDate.getDate() + dayIndex);
                return (
                  <div key={day} className="p-3 text-center border-l border-slate-200">
                    <div className="text-xs text-slate-500">{day}</div>
                    <div className="text-slate-900 mt-1">{cellDate.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            <div className="max-h-[500px] overflow-y-auto">
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 border-b border-slate-200 min-h-[80px]">
                  <div className="p-3 text-xs text-slate-500 bg-slate-50 border-r border-slate-200">{time}</div>
                  {weekDays.map((day, dayIndex) => (
                    <div
                      key={`${day}-${time}`}
                      className="border-l border-slate-200 p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {/* Display appointments for this day and time slot */}
                      {getAppointmentsForDayAndTime(dayIndex, time).map((appt) => (
                        <div key={appt.id} className="bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 rounded-lg p-2 mb-1 text-xs">
                          <div className="font-semibold text-cyan-900 truncate">{appt.client}</div>
                          <div className="text-cyan-700 text-xs font-medium truncate">{appt.doctor}</div>
                          <div className="text-cyan-600 text-xs mt-0.5 truncate">{appt.purpose}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Video className="w-3 h-3 text-cyan-600" />
                            <span className="text-xs text-cyan-600">{appt.duration} min</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments List */}
      <Card className="border-slate-200 rounded-2xl">
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-slate-600">Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <p className="text-slate-600">No appointments scheduled.</p>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={appointment.image} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                    {appointment.client.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="text-slate-900 font-semibold">{appointment.client}</div>
                  <div className="text-sm text-slate-600 mt-0.5">{appointment.doctor}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-600">{appointment.date}</span>
                    <span className="text-sm text-slate-400">•</span>
                    <span className="text-sm text-slate-600 font-medium">{appointment.time}</span>
                    <span className="text-sm text-slate-400">•</span>
                    <span className="text-sm text-slate-600">{appointment.duration} min</span>
                    <span className="text-sm text-slate-400">•</span>
                    <span className="text-sm text-cyan-600 font-medium">{appointment.purpose}</span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={`${
                    appointment.status === 'confirmed'
                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                      : 'border-amber-300 text-amber-700 bg-amber-50'
                  }`}
                >
                  {appointment.status}
                </Badge>

                <div className="flex gap-2">
                  {appointment.type === 'video' && (
                    <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors">
                      Join Session
                    </button>
                  )}
                  <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                    Details
                  </button>
                  <button className="p-2 hover:bg-white rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">This Week</div>
            <div className="text-slate-900 mt-2">28 appointments</div>
            <div className="text-xs text-emerald-600 mt-1">+3 from last week</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Pending Confirmations</div>
            <div className="text-slate-900 mt-2">4 appointments</div>
            <div className="text-xs text-amber-600 mt-1">2 require attention</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Cancellations</div>
            <div className="text-slate-900 mt-2">2 this week</div>
            <div className="text-xs text-slate-500 mt-1">Within policy</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
