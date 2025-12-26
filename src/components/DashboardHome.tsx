import { Calendar, Clock, UserPlus, ClipboardList, Plus, FileText, Upload, Users, Activity, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/config';

interface DashboardHomeProps {
  userName?: string;
}

export function DashboardHome({ userName }: DashboardHomeProps) {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [todaysSessions, setTodaysSessions] = useState<any[]>([]);
  const [weekSessionsCount, setWeekSessionsCount] = useState(0);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);
  const [activePlansCount, setActivePlansCount] = useState(0);
  const [plansEndingThisWeekCount, setPlansEndingThisWeekCount] = useState(0);
  const [todaysNotes, setTodaysNotes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [newRegistrations, setNewRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);

  // Appointment search state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

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

  const fetchRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const res = await fetch(apiUrl('/api/registrations'));
      if (res.ok) {
        const data = await res.json();
        setNewRegistrations(data || []);
      }
    } catch (err) {
      console.error('Error fetching registrations', err);
    }
    setLoadingRegistrations(false);
  };

  useEffect(() => {
    fetchClients();
    fetchDoctors();
    fetchRegistrations();
    fetchTasks();
    
    const handler = () => {
      fetchClients();
      fetchRegistrations();
      fetchTasks();
    };
    window.addEventListener('client:created', handler as EventListener);
    return () => window.removeEventListener('client:created', handler as EventListener);
  }, []);
  // Note form state
  const [noteType, setNoteType] = useState('Progress Note');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteTime, setNoteTime] = useState('09:00');
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
  
  // Appointment form state
  const [appointmentDoctor, setAppointmentDoctor] = useState(userName || '');
  const [appointmentClient, setAppointmentClient] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentDuration, setAppointmentDuration] = useState('60');
  const [appointmentType, setAppointmentType] = useState('Therapy Session');

  // Submit new appointment to backend
  const createAppointment = async () => {
    if (!appointmentClient) {
      alert('Please select a patient');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);
    
    // Validate appointment date/time
    if (appointmentDate < today) {
      alert('⚠️ Cannot create appointment for a past date');
      return;
    }
    
    if (appointmentDate === today && appointmentTime <= currentTime) {
      alert('⚠️ Cannot create appointment for a time that has already passed. Please set a future time or choose tomorrow.');
      return;
    }

    // Create datetime with explicit Z suffix for UTC
    const datetime = `${appointmentDate}T${appointmentTime}:00Z`;
    const duration = parseInt(appointmentDuration);

    try {
      // First, check availability
      const availRes = await fetch(
        apiUrl(`/api/appointments/check-availability?doctor=${encodeURIComponent(appointmentDoctor)}&datetime_str=${encodeURIComponent(datetime)}&duration=${duration}`)
      );
      
      if (!availRes.ok) {
        alert('Error checking availability');
        return;
      }

      const availData = await availRes.json();
      if (!availData.available) {
        alert(`⚠️ Time slot not available!\n\n${availData.message}\n\nPlease choose a different time.`);
        return;
      }

      // If available, proceed with creating the appointment
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
        const err = await res.text();
        console.error('Failed to create appointment', err);
        try {
          const errData = JSON.parse(err);
          alert(`Failed: ${errData.detail}`);
        } catch {
          alert('Failed to create appointment');
        }
        return;
      }

      const data = await res.json();
      console.log('Created appointment', data);
      // Dispatch event so AppointmentsPage can refresh
      try {
        window.dispatchEvent(new CustomEvent('appointment:created', { detail: data }));
      } catch (e) {
        // ignore
      }
      // Reset form and close modal
      setAppointmentDoctor(userName || '');
      setAppointmentClient('');
      setAppointmentDate(new Date().toISOString().split('T')[0]);
      setAppointmentTime('09:00');
      setAppointmentDuration('60');
      setAppointmentType('Therapy Session');
      setShowAppointmentModal(false);
      alert('✅ Appointment created successfully!');
    } catch (error) {
      console.error('Error creating appointment', error);
      alert('Error creating appointment');
    }
  };

  // Submit new client to backend
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
        const err = await res.text();
        console.error('Failed to create client', err);
        alert('Failed to create client');
        return;
      }

      const data = await res.json();
      console.log('Created client', data);
      // Dispatch a global event so other components (like ClientsPage) can refresh
      try {
        window.dispatchEvent(new CustomEvent('client:created', { detail: data }));
      } catch (e) {
        // ignore in non-browser environments
      }
      // Reset form and close modal
      setClientFirstName('');
      setClientLastName('');
      setClientEmail('');
      setClientPhone('');
      setClientDob('');
      setClientGender('');
      setShowAddClientModal(false);
      // Optional: notify user
      alert('Client added successfully');
    } catch (error) {
      console.error('Error creating client', error);
      alert('Error creating client');
    }
  };

  // Submit new note to backend
  const createNote = async () => {
    if (!noteContent.trim()) {
      alert('Please enter note content');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().substring(0, 5);

    // Validate reminder date/time
    if (noteDate && noteTime) {
      // Don't allow past dates
      if (noteDate < today) {
        alert('⚠️ Cannot set reminder for a past date');
        return;
      }
      
      // If reminder is for today, check if time has passed
      if (noteDate === today && noteTime <= currentTime) {
        alert('⚠️ Cannot set reminder for a time that has already passed. Please set a future time or choose tomorrow.');
        return;
      }
    } else if (noteDate && !noteTime) {
      alert('Please set a reminder time');
      return;
    } else if (!noteDate && noteTime) {
      alert('Please set a reminder date');
      return;
    }

    const payload = {
      note_type: noteType,
      content: noteContent,
      client_id: null, // Could be extended to link to a specific client
      reminder_date: noteDate,
      reminder_time: noteTime,
    };

    try {
      const res = await fetch(apiUrl('/api/notes'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error('Failed to create note', err);
        alert('Failed to create note');
        return;
      }

      const data = await res.json();
      console.log('Created note', data);
      // Dispatch event so NotesPage can refresh
      try {
        window.dispatchEvent(new CustomEvent('note:created', { detail: data }));
      } catch (e) {
        // ignore
      }
      // Reset form and close modal
      setNoteType('Progress Note');
      setNoteContent('');
      setNoteDate(new Date().toISOString().split('T')[0]);
      setNoteTime('09:00');
      setShowAddNoteModal(false);
      alert('✅ Note saved successfully!');
    } catch (error) {
      console.error('Error creating note', error);
      alert('Error creating note');
    }
  };

  // Mark note as completed
  const completeNote = async (noteId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/notes/${noteId}/complete`), {
        method: 'PATCH',
      });

      if (!res.ok) {
        alert('Failed to complete note');
        return;
      }

      // Remove from today's notes list
      setTodaysNotes(todaysNotes.filter((note: any) => note.id !== noteId));
      
      // Dispatch event to update NotesPage
      window.dispatchEvent(new CustomEvent('note:updated', { detail: { id: noteId, completed: true } }));
      
      console.log('✅ Note marked as completed:', noteId);
    } catch (error) {
      console.error('Error completing note', error);
      alert('Error completing note');
    }
  };

  // Delete note from database
  const deleteNoteFromDashboard = async (noteId: string) => {
    try {
      const res = await fetch(apiUrl(`/api/notes/${noteId}`), {
        method: 'DELETE',
      });

      if (!res.ok) {
        alert('Failed to delete note');
        return;
      }

      // Remove from display
      setTodaysNotes(todaysNotes.filter((note: any) => note.id !== noteId));
      window.dispatchEvent(new CustomEvent('note:deleted', { detail: { id: noteId } }));
    } catch (error) {
      console.error('Error deleting note', error);
      alert('Error deleting note');
    }
  };

  // Fetch today's appointments and notes
  useEffect(() => {
    const fetchTodayData = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().substring(0, 5);
      try {
        // Fetch all appointments
        const apptRes = await fetch(apiUrl('/api/appointments'));
        if (apptRes.ok) {
          const appts = await apptRes.json();
          
          // Calculate week stats
          const startOfWeek = new Date(now);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
          endOfWeek.setHours(23, 59, 59, 999);

          const weekAppts = appts.filter((appt: any) => {
            const d = new Date(appt.datetime);
            return d >= startOfWeek && d <= endOfWeek;
          });
          setWeekSessionsCount(weekAppts.length);
          setCompletedSessionsCount(weekAppts.filter((a: any) => a.status === 'completed').length);

          // Filter for today only
          const todayAppts = appts.filter((appt: any) => {
            const apptDate = appt.datetime.split('T')[0];
            return apptDate === today;
          }).map((appt: any) => {
            const timeStr = appt.datetime.split('T')[1].substring(0, 5);
            const [hours, mins] = timeStr.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
            return {
              id: appt.id,
              client: appt.client,
              time: `${displayHour}:${mins} ${ampm}`,
              type: appt.purpose,
              status: 'upcoming',
              doctor: appt.doctor
            };
          });
          setTodaysSessions(todayAppts);
        }

        // Fetch all notes
        const notesRes = await fetch(apiUrl('/api/notes'));
        if (notesRes.ok) {
          const notes = await notesRes.json();
          
          // Calculate Active Plans (Treatment Plans)
          const treatmentPlans = notes.filter((n: any) => n.note_type === 'Treatment Plan');
          setActivePlansCount(treatmentPlans.length);
          
          // Plans ending this week (using reminder_date as a proxy for review/end date)
          const nextWeek = new Date(now);
          nextWeek.setDate(now.getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];
          
          const endingSoon = treatmentPlans.filter((n: any) => {
            return n.reminder_date && n.reminder_date >= today && n.reminder_date <= nextWeekStr;
          });
          setPlansEndingThisWeekCount(endingSoon.length);

          // Filter for today based on REMINDER DATE - only if reminder_date is actually set
          // AND the reminder time hasn't passed yet
          const todayNotes = notes.filter((note: any) => {
            // Skip completed notes
            if (note.completed) return false;
            
            if (note.reminder_date !== today) return false;
            
            // If reminder has a time set, check if it has passed
            if (note.reminder_time) {
              return note.reminder_time >= currentTime; // Show only future times
            }
            
            return true; // Show if no time is set
          });
          setTodaysNotes(todayNotes);
        }
      } catch (error) {
        console.error('Error fetching today data', error);
      }
    };

    fetchTodayData();

    // Listen for appointment/note creation events
    const handleAppointmentCreated = () => fetchTodayData();
    const handleNoteCreated = () => fetchTodayData();
    
    window.addEventListener('appointment:created', handleAppointmentCreated);
    window.addEventListener('note:created', handleNoteCreated);

    return () => {
      window.removeEventListener('appointment:created', handleAppointmentCreated);
      window.removeEventListener('note:created', handleNoteCreated);
    };
  }, []);

  const quickActions = [
    { icon: UserPlus, label: 'Add Client', color: 'from-sky-500 to-blue-500', action: () => setShowAddClientModal(true) },
    { icon: Calendar, label: 'Create Appointment', color: 'from-cyan-500 to-teal-500', action: () => setShowAppointmentModal(true) },
    { icon: FileText, label: 'Add Note', color: 'from-blue-500 to-cyan-500', action: () => setShowAddNoteModal(true) },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-slate-900">Welcome back, {userName || 'Dr. Admin'}</h1>
        <p className="text-slate-600 mt-1">Here's what's happening with your practice today.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Clients</p>
                <p className="text-slate-900 mt-2">{clients.length}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>Active roster</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
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
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                  <span>{plansEndingThisWeekCount} ending this week</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Sessions This Week</p>
                <p className="text-slate-900 mt-2">{weekSessionsCount}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{completedSessionsCount} completed</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
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
                <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <span>{tasks.filter(t => t.priority === 'high').length} high priority</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-white" />
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
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                  onClick={action.action}
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

      {/* Today's Notes */}
      <Card className="border-slate-200 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Today's Reminders</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysNotes.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaysNotes.map((note: any) => (
                <div 
                  key={note.id} 
                  className="group flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-600 uppercase tracking-tight">
                        {note.note_type === 'Progress Note' ? '📝' : '📋'} {note.note_type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {note.reminder_time}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-1">
                      {note.content}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        completeNote(note.id);
                      }}
                      className="p-2 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Mark as done"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteNoteFromDashboard(note.id)}
                      className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Patient Registrations from mbctherapy.com */}
        <Card className="border-slate-200 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-600" />
                <span>New Patient Registrations</span>
              </div>
              <Badge className="bg-cyan-100 text-cyan-700 border-0">mbctherapy.com</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 mb-4">
              <button className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-xs">
                All
              </button>
              <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
                New
              </button>
              <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
                Pending
              </button>
              <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
                Verified
              </button>
            </div>
            {loadingRegistrations ? (
              <p className="text-sm text-slate-500 py-4 text-center">Loading registrations...</p>
            ) : newRegistrations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No new registrations from website</p>
              </div>
            ) : (
              newRegistrations.slice(0, 5).map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                      {registration.name.split(' ').map((n: any) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-900">{registration.name}</div>
                    <div className="text-xs text-slate-500 truncate">{registration.email}</div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={`text-xs mb-1 ${
                        registration.status === 'verified'
                          ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                          : registration.status === 'pending'
                          ? 'border-amber-300 text-amber-700 bg-amber-50'
                          : 'border-cyan-300 text-cyan-700 bg-cyan-50'
                      }`}
                    >
                      {registration.status}
                    </Badge>
                    <div className="text-[10px] text-slate-400">
                      {new Date(registration.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
            <button className="w-full py-3 text-sm text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors">
              View All Registrations →
            </button>
          </CardContent>
        </Card>

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
            <button className="w-full py-3 text-sm text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors">
              View All Tasks →
            </button>
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
                <CardTitle>Add Note</CardTitle>
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
                <label className="text-sm text-slate-700 mb-2 block">Note Type</label>
                <select 
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option>Progress Note</option>
                  <option>Intake Form</option>
                  <option>Session Summary</option>
                  <option>Treatment Plan</option>
                  <option>Assessment</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Note Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note here..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Reminder Date</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Min date: Today</p>
                </div>
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Reminder Time</label>
                  <input
                    type="time"
                    value={noteTime}
                    onChange={(e) => setNoteTime(e.target.value)}
                    min={noteDate === new Date().toISOString().split('T')[0] ? new Date().toTimeString().substring(0, 5) : undefined}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  {noteDate === new Date().toISOString().split('T')[0] && (
                    <p className="text-xs text-slate-500 mt-1">Min time today: {new Date().toTimeString().substring(0, 5)}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddNoteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createNote}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm hover:from-cyan-700 hover:to-teal-700 transition-all"
                >
                  Add Note
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            onClick={() => setShowAddClientModal(false)}
          />
          <Card className="relative w-full max-w-lg border-slate-200 rounded-2xl shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Register New Patient</CardTitle>
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Email Address</label>
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

              <div className="grid grid-cols-2 gap-4">
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
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddClientModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createClient}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm hover:from-cyan-700 hover:to-teal-700 transition-all"
                >
                  Register Patient
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}