import { ChevronLeft, ChevronRight, Video, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/config';

interface DoctorAppointmentsProps {
  userName?: string;
}

export function DoctorAppointments({ userName }: DoctorAppointmentsProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/appointments'));
      if (res.ok) {
        const data = await res.json();
        // Filter for this doctor
        const filtered = (data || []).filter((a: any) => a.doctor === userName);
        
        const list = filtered.map((appt: any) => {
          const parts = appt.datetime.split('T');
          const dateStr = parts[0];
          const timeStr = parts[1].substring(0, 5);
          const [h, m] = timeStr.split(':');
          const hours = parseInt(h);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 === 0 ? 12 : hours % 12;
          
          return {
            id: appt.id || appt._id,
            client: appt.client,
            date: dateStr,
            time: `${displayHours}:${m} ${ampm}`,
            duration: `${appt.duration || 60} min`,
            type: 'video', // Default to video for now
            status: appt.status || 'confirmed',
            image: ''
          };
        });
        setAppointments(list);
      }
    } catch (err) {
      console.error('Error fetching appointments', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAppointments();
  }, [userName]);

  const todayStr = currentDate.toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === todayStr);

  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 5; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        fullDate: d.toISOString().split('T')[0]
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const weekRangeText = `${new Date(weekDays[0].fullDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}-${new Date(weekDays[4].fullDate).getDate()}, ${new Date(weekDays[4].fullDate).getFullYear()}`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-slate-900">My Appointments</h1>
        <p className="text-slate-600 mt-1">View and manage your session schedule</p>
      </div>

      <Card className="border-slate-200 rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 7);
                    setCurrentDate(d);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="text-slate-900">This Week - {weekRangeText}</div>
                <button 
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 7);
                    setCurrentDate(d);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
              >
                Today
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Simple Week View */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {weekDays.map((day) => {
              const dayAppts = appointments.filter(a => a.date === day.fullDate);
              const isSelected = day.fullDate === todayStr;
              return (
                <div
                  key={day.fullDate}
                  onClick={() => {
                    const d = new Date(day.fullDate);
                    setCurrentDate(d);
                  }}
                  className={`p-4 rounded-xl text-center cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-xs text-slate-500">{day.name}</div>
                  <div className={`mt-1 ${isSelected ? 'text-cyan-900' : 'text-slate-900'}`}>
                    {day.date}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {dayAppts.length} sessions
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments List */}
      <Card className="border-slate-200 rounded-2xl">
        <CardHeader>
          <CardTitle>Sessions for {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading appointments...</div>
          ) : todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No sessions scheduled for this day.</div>
          ) : (
            todayAppointments.map((appointment) => (
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
                  <div className="text-slate-900">{appointment.client}</div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-slate-500">{appointment.time}</span>
                    <span className="text-sm text-slate-400">•</span>
                    <span className="text-sm text-slate-500">{appointment.duration}</span>
                    <div className="flex items-center gap-1">
                      <Video className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm text-cyan-600">Video Call</span>
                    </div>
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
                  <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors">
                    Join Session
                  </button>
                  <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Week Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">This Week</div>
            <div className="text-slate-900 mt-2">{appointments.filter(a => {
              const d = new Date(a.date);
              const start = new Date(weekDays[0].fullDate);
              const end = new Date(weekDays[4].fullDate);
              return d >= start && d <= end;
            }).length} appointments</div>
            <div className="text-xs text-slate-500 mt-1">Dynamic summary</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
