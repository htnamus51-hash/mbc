import { Calendar, Clock, Plus, FileText, Users, CheckCircle2, X, Video } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/config';

interface DoctorHomeProps {
  userName?: string;
}

export function DoctorHome({ userName }: DoctorHomeProps) {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [todaysSessions, setTodaysSessions] = useState<any[]>([]);
  const [weekSessionsCount, setWeekSessionsCount] = useState(0);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);
  const [activePlansCount, setActivePlansCount] = useState(0);
  const [plansEndingThisWeekCount, setPlansEndingThisWeekCount] = useState(0);
  const [tasks, setTasks] = useState<any[]>([]);

  // Appointment search state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [appointmentClient, setAppointmentClient] = useState('');
  const [appointmentDoctor, setAppointmentDoctor] = useState(userName || '');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentDuration, setAppointmentDuration] = useState('60');
  const [appointmentType, setAppointmentType] = useState('Therapy Session');

  const fetchTasks = async () => {
    try {
      const res = await fetch(apiUrl('/api/tasks'));
      if (res.ok) {
        const data = await res.json();
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Error fetching tasks', err);
    }
  };

  const toggleTask = async (taskId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/tasks/${taskId}?completed=true`), {
        method: 'PATCH',
      });
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
      }
    } catch (err) {
      console.error('Error toggling task', err);
    }
  };

  const createTask = async () => {
    if (!taskText) return;
    try {
      const res = await fetch(apiUrl('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: taskText,
          type: taskType,
          priority: taskPriority,
        }),
      });
      if (res.ok) {
        fetchTasks();
        setTaskText('');
        setShowAddTaskModal(false);
      }
    } catch (err) {
      console.error('Error creating task', err);
    }
  };

  const createAppointment = async () => {
    if (!appointmentClient) {
      alert('Please select a patient');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    if (appointmentDate < today) {
      alert('⚠️ Cannot create appointment for a past date');
      return;
    }
    
    if (appointmentDate === today && appointmentTime <= currentTime) {
      alert('⚠️ Cannot create appointment for a time that has already passed.');
      return;
    }

    const datetime = `${appointmentDate}T${appointmentTime}:00Z`;
    const duration = parseInt(appointmentDuration);

    try {
      const availRes = await fetch(
        apiUrl(`/api/appointments/check-availability?doctor=${encodeURIComponent(appointmentDoctor)}&datetime_str=${encodeURIComponent(datetime)}&duration=${duration}`)
      );
      
      if (!availRes.ok) {
        alert('Error checking availability');
        return;
      }

      const availData = await availRes.json();
      if (!availData.available) {
        alert(`⚠️ Time slot not available!\n\n${availData.message}`);
        return;
      }

      const payload = {
        doctor: appointmentDoctor,
        client: appointmentClient,
        datetime: datetime,
        purpose: appointmentType,
        duration: duration,
      };

      const res = await fetch(apiUrl('/api/appointments'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert('Failed to create appointment');
        return;
      }

      const data = await res.json();
      window.dispatchEvent(new CustomEvent('appointment:created', { detail: data }));
      
      setAppointmentClient('');
      setClientSearchQuery('');
      setShowAppointmentModal(false);
      alert('✅ Appointment created successfully!');
    } catch (error) {
      console.error('Error creating appointment', error);
      alert('Error creating appointment');
    }
  };

  // Add Client form state
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [clientGender, setClientGender] = useState('');

  // Task form state
  const [taskText, setTaskText] = useState('');
  const [taskType, setTaskType] = useState<'note' | 'form' | 'message' | 'document'>('note');
  const [taskPriority, setTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch(apiUrl('/api/clients'));
      if (res.ok) {
        const data = await res.json();
        setClients(data || []);
      }
    } catch (err) {
      console.error('Error fetching clients', err);
    }
    setLoadingClients(false);
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(apiUrl('/api/doctors'));
      if (res.ok) {
        const data = await res.json();
        setDoctors(data || []);
        // Set default doctor if none selected
        if (data.length > 0 && !appointmentDoctor) {
          setAppointmentDoctor(data[0].full_name);
        }
      }
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  const fetchTodaysSessions = async () => {
    try {
      const res = await fetch(apiUrl('/api/appointments'));
      if (res.ok) {
        const data = await res.json();
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Calculate week stats for this doctor
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
        endOfWeek.setHours(23, 59, 59, 999);

        const myAppts = (data || []).filter((a: any) => a.doctor === userName);
        const weekAppts = myAppts.filter((appt: any) => {
          const d = new Date(appt.datetime);
          return d >= startOfWeek && d <= endOfWeek;
        });
        setWeekSessionsCount(weekAppts.length);
        setCompletedSessionsCount(weekAppts.filter((a: any) => a.status === 'completed').length);

        const todayAppts = myAppts.filter((a: any) => a.datetime.startsWith(today));
        
        const list = todayAppts.map((appt: any) => {
          const timeStr = appt.datetime.split('T')[1].split(':').slice(0, 2).join(':');
          const [h, m] = timeStr.split(':');
          const hours = parseInt(h);
          const ampm = hours >= 12 ? 'PM' : 'AM';
          const displayHours = hours % 12 === 0 ? 12 : hours % 12;
          
          return {
            id: appt.id || appt._id,
            client: appt.client,
            time: `${displayHours}:${m} ${ampm}`,
            type: appt.purpose,
            status: 'upcoming'
          };
        });
        setTodaysSessions(list);
      }

      // Fetch notes to calculate active plans for this doctor
      const notesRes = await fetch(apiUrl('/api/notes'));
      if (notesRes.ok) {
        const notes = await notesRes.json();
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // Filter for Treatment Plans created by this doctor (or linked to their clients)
        // Since we don't have a strict 'created_by' email in notes yet, we'll filter by type
        const treatmentPlans = notes.filter((n: any) => n.note_type === 'Treatment Plan');
        setActivePlansCount(treatmentPlans.length);

        const nextWeek = new Date(now);
        nextWeek.setDate(now.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        
        const endingSoon = treatmentPlans.filter((n: any) => {
          return n.reminder_date && n.reminder_date >= today && n.reminder_date <= nextWeekStr;
        });
        setPlansEndingThisWeekCount(endingSoon.length);
      }
    } catch (err) {
      console.error('Error fetching sessions', err);
    }
  };

  const createClient = async () => {
    const payload = {
      first_name: clientFirstName,
      last_name: clientLastName,
      email: clientEmail,
      phone: clientPhone,
      date_of_birth: clientDob,
      gender: clientGender,
    };

    try {
      const res = await fetch(apiUrl('/api/clients'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        alert('Failed to create client');
        return;
      }

      const data = await res.json();
      window.dispatchEvent(new CustomEvent('client:created', { detail: data }));
      
      // Reset form
      setClientFirstName('');
      setClientLastName('');
      setClientEmail('');
      setClientPhone('');
      setClientDob('');
      setClientGender('');
      setShowAddClientModal(false);
      alert('✅ Client registered successfully!');
    } catch (error) {
      console.error('Error creating client', error);
      alert('Error creating client');
    }
  };

  useEffect(() => {
    fetchClients();
    fetchDoctors();
    fetchTodaysSessions();
    fetchTasks();
    
    const handler = () => {
      fetchClients();
      fetchDoctors();
      fetchTodaysSessions();
      fetchTasks();
    };
    window.addEventListener('client:created', handler as EventListener);
    window.addEventListener('appointment:created', handler as EventListener);
    return () => {
      window.removeEventListener('client:created', handler as EventListener);
      window.removeEventListener('appointment:created', handler as EventListener);
    };
  }, []);

  const quickActions = [
    { icon: Calendar, label: 'Schedule Session', color: 'from-cyan-500 to-teal-500', action: () => setShowAppointmentModal(true) },
    { icon: FileText, label: 'Add Progress Note', color: 'from-blue-500 to-cyan-500', action: () => setShowAddNoteModal(true) },
    { icon: Plus, label: 'Add Client', color: 'from-teal-500 to-emerald-500', action: () => setShowAddClientModal(true) },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-slate-900">Welcome back, {userName || 'Doctor'}</h1>
        <p className="text-slate-600 mt-1">Here's your schedule and tasks for today.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Today's Sessions</p>
                <p className="text-slate-900 mt-2">{todaysSessions.length}</p>
                <div className="text-xs text-slate-500 mt-1">
                  {todaysSessions.length > 0 ? `Next at ${todaysSessions[0].time}` : 'No sessions today'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">My Clients</p>
                <p className="text-slate-900 mt-2">{clients.length}</p>
                <div className="text-xs text-emerald-600 mt-1">Active roster</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Active Plans</p>
                <p className="text-slate-900 mt-2">{activePlansCount}</p>
                <div className="text-xs text-slate-500 mt-1">
                  {plansEndingThisWeekCount} ending this week
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Tasks</p>
                <p className="text-slate-900 mt-2">{tasks.length}</p>
                <div className="text-xs text-amber-600 mt-1">
                  {tasks.filter(t => t.priority === 'high').length} high priority
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">This Week</p>
                <p className="text-slate-900 mt-2">{weekSessionsCount} sessions</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{completedSessionsCount} completed</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <Card className="lg:col-span-2 border-slate-200 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Today's Schedule</span>
              <Badge variant="outline" className="text-xs">{todaysSessions.length} sessions</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todaysSessions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No sessions scheduled for today</p>
              </div>
            ) : (
              todaysSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-center w-16 h-16 bg-white rounded-xl border border-slate-200">
                    <div className="text-center">
                      <div className="text-xs text-slate-500">
                        {session.time.split(' ')[1]}
                      </div>
                      <div className="text-sm text-slate-900">
                        {session.time.split(' ')[0]}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-900">{session.client}</div>
                    <div className="text-sm text-slate-500">{session.type}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      Details
                    </button>
                    <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors">
                      Start Session
                    </button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-200 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-slate-900">{action.label}</span>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowAppointmentModal(false)}
          />
          
          {/* Modal Card */}
          <Card className="relative w-full max-w-lg border-slate-200 rounded-2xl shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Create New Appointment</CardTitle>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Doctor Name</label>
                <select
                  value={appointmentDoctor}
                  onChange={(e) => setAppointmentDoctor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {doctors.length > 0 ? (
                    doctors.map((doc: any) => (
                      <option key={doc.email} value={doc.full_name}>
                        {doc.full_name}
                      </option>
                    ))
                  ) : (
                    <option>{userName || 'Select Doctor'}</option>
                  )}
                </select>
              </div>

              <div className="relative">
                <label className="text-sm text-slate-700 mb-2 block">Patient Name</label>
                <input
                  type="text"
                  placeholder="Type name or registration ID..."
                  value={clientSearchQuery || appointmentClient}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
                {showClientDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                    {clients
                      .filter(c => 
                        `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        (c.id && c.id.toString().toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
                        (c._id && c._id.toString().toLowerCase().includes(clientSearchQuery.toLowerCase()))
                      )
                      .map((client: any) => (
                        <div
                          key={client.id || client._id}
                          className="px-4 py-3 hover:bg-cyan-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                          onClick={() => {
                            setAppointmentClient(`${client.first_name} ${client.last_name}`);
                            setClientSearchQuery(`${client.first_name} ${client.last_name}`);
                            setShowClientDropdown(false);
                          }}
                        >
                          <div className="font-medium text-slate-900">{client.first_name} {client.last_name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded">ID: {(client.id || client._id || '').toString().slice(-6)}</span>
                            <span>{client.email}</span>
                          </div>
                        </div>
                      ))}
                    {clients.filter(c => 
                      `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                      (c.id && c.id.toString().toLowerCase().includes(clientSearchQuery.toLowerCase())) ||
                      (c._id && c._id.toString().toLowerCase().includes(clientSearchQuery.toLowerCase()))
                    ).length === 0 && (
                      <div className="px-4 py-4 text-sm text-slate-500 text-center">
                        No patients found matching "{clientSearchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Date</label>
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Time</label>
                <input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Duration (minutes)</label>
                <select
                  value={appointmentDuration}
                  onChange={(e) => setAppointmentDuration(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="30">30</option>
                  <option value="45">45</option>
                  <option value="60">60</option>
                  <option value="90">90</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Session Type</label>
                <select
                  value={appointmentType}
                  onChange={(e) => setAppointmentType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option>Initial Consultation</option>
                  <option>Follow-up Session</option>
                  <option>Therapy Session</option>
                  <option>CBT Session</option>
                  <option>Couples Therapy</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    createAppointment();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm hover:from-cyan-700 hover:to-teal-700 transition-all"
                >
                  Create Appointment
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowAddClientModal(false)}
          />
          
          {/* Modal Card */}
          <Card className="relative w-full max-w-lg border-slate-200 rounded-2xl shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Add New Client</CardTitle>
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">First Name</label>
                  <input
                    type="text"
                    value={clientFirstName}
                    onChange={(e) => setClientFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Last Name</label>
                  <input
                    type="text"
                    value={clientLastName}
                    onChange={(e) => setClientLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Email</label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Phone Number</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Date of Birth</label>
                  <input
                    type="date"
                    value={clientDob}
                    onChange={(e) => setClientDob(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Gender</label>
                <select
                  value={clientGender}
                  onChange={(e) => setClientGender(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Select a gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    createClient();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm hover:from-cyan-700 hover:to-teal-700 transition-all"
                >
                  Add Client
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowAddNoteModal(false)}
          />
          
          {/* Modal Card */}
          <Card className="relative w-full max-w-lg border-slate-200 rounded-2xl shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Add Progress Note</CardTitle>
                <button
                  onClick={() => setShowAddNoteModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Date</label>
                <input
                  type="date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Session Type</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent">
                  <option>Initial Consultation</option>
                  <option>Follow-up Session</option>
                  <option>Therapy Session</option>
                  <option>CBT Session</option>
                  <option>Couples Therapy</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Notes</label>
                <textarea
                  placeholder="Enter progress notes here..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  rows={8}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddNoteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle note creation
                    setShowAddNoteModal(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm hover:from-cyan-700 hover:to-teal-700 transition-all"
                >
                  Add Note
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Tasks */}
      <Card className="border-slate-200 rounded-2xl">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle>Pending Tasks</CardTitle>
          <button 
            onClick={() => setShowAddTaskModal(true)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-cyan-600"
          >
            <Plus className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No pending tasks! All caught up.</div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
              >
                <div className="mt-0.5">
                  <div className="w-5 h-5 rounded border-2 border-slate-300 group-hover:border-cyan-500 transition-colors flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-cyan-500 opacity-0 group-hover:opacity-50" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-slate-900">{task.task}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        task.type === 'note'
                          ? 'border-blue-300 text-blue-700 bg-blue-50'
                          : task.type === 'form'
                          ? 'border-purple-300 text-purple-700 bg-purple-50'
                          : task.type === 'message'
                          ? 'border-cyan-300 text-cyan-700 bg-cyan-50'
                          : 'border-slate-300 text-slate-700 bg-slate-50'
                      }`}
                    >
                      {task.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        task.priority === 'high'
                          ? 'border-red-300 text-red-700 bg-red-50'
                          : task.priority === 'medium'
                          ? 'border-amber-300 text-amber-700 bg-amber-50'
                          : 'border-slate-300 text-slate-700 bg-slate-50'
                      }`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* This Week Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Sessions Completed</div>
            <div className="text-slate-900 mt-2">12 / 22</div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: '55%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">New Messages</div>
            <div className="text-slate-900 mt-2">8 unread</div>
            <div className="text-xs text-cyan-600 mt-1">3 require response</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="text-sm text-slate-600">Forms Pending</div>
            <div className="text-slate-900 mt-2">3 to review</div>
            <div className="text-xs text-slate-500 mt-1">2 completed today</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowAddTaskModal(false)}
          />
          <Card className="relative w-full max-w-md border-slate-200 rounded-2xl shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Add New Task</CardTitle>
                <button
                  onClick={() => setShowAddTaskModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-slate-700 mb-2 block">Task Description</label>
                <input
                  type="text"
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="e.g. Complete progress notes"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Type</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  >
                    <option value="note">Note</option>
                    <option value="form">Form</option>
                    <option value="message">Message</option>
                    <option value="document">Document</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <button
                onClick={createTask}
                disabled={!taskText}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50"
              >
                Create Task
              </button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}