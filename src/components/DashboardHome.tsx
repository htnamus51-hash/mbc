import { Calendar, Clock, UserPlus, ClipboardList, Plus, FileText, Upload, Users, Activity, CheckCircle2, TrendingUp, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState, useEffect } from 'react';
import { apiUrl } from '@/config';

export function DashboardHome() {
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [todaysSessions, setTodaysSessions] = useState<any[]>([]);
  const [todaysNotes, setTodaysNotes] = useState<any[]>([]);
  // Note form state
  const [noteType, setNoteType] = useState('Progress Note');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState('2025-11-20');
  const [noteTime, setNoteTime] = useState('09:00');
  // Add Client form state
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [clientGender, setClientGender] = useState('');
  
  // Appointment form state
  const [appointmentDoctor, setAppointmentDoctor] = useState('Dr. Rebecca Smith');
  const [appointmentClient, setAppointmentClient] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('2025-11-18');
  const [appointmentTime, setAppointmentTime] = useState('09:00');
  const [appointmentDuration, setAppointmentDuration] = useState('60');
  const [appointmentType, setAppointmentType] = useState('Therapy Session');

  // Submit new appointment to backend
  const createAppointment = async () => {
    if (!appointmentClient) {
      alert('Please select a patient');
      return;
    }

    const today = '2025-11-18'; // This should match your actual today date
    const currentTime = '15:34'; // Current time
    
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
      setAppointmentDoctor('Dr. Rebecca Smith');
      setAppointmentClient('');
      setAppointmentDate('2025-11-18');
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

    const today = '2025-11-20'; // Current date
    const currentTime = '15:34'; // Current time

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
      setNoteDate('2025-11-20');
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
      const today = '2025-11-20'; // Today's date
      const currentTime = '15:34'; // Current time
      try {
        // Fetch all appointments
        const apptRes = await fetch(apiUrl('/api/appointments'));
        if (apptRes.ok) {
          const appts = await apptRes.json();
          // Filter for today only AND future times only
          const todayAppts = appts.filter((appt: any) => {
            const apptDate = appt.datetime.split('T')[0];
            if (apptDate !== today) return false;
            
            // Filter out past times
            const timeStr = appt.datetime.split('T')[1].substring(0, 5);
            return timeStr >= currentTime; // Only show future appointments
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

  const newRegistrations = [
    { id: 1, name: 'Amanda Foster', email: 'amanda.f@email.com', date: '2 hours ago', status: 'pending', source: 'mbctherapy.com' },
    { id: 2, name: 'Robert Kim', email: 'robert.kim@email.com', date: '5 hours ago', status: 'verified', source: 'mbctherapy.com' },
    { id: 3, name: 'Jessica Martinez', email: 'j.martinez@email.com', date: '1 day ago', status: 'new', source: 'mbctherapy.com' },
  ];

  const pendingTasks = [
    { id: 1, task: 'Complete progress notes for Sarah Johnson', type: 'note', priority: 'high' },
    { id: 2, task: 'Review intake form for Michael Chen', type: 'form', priority: 'medium' },
    { id: 3, task: 'Respond to message from Emily Rodriguez', type: 'message', priority: 'high' },
    { id: 4, task: 'Upload treatment plan for David Thompson', type: 'document', priority: 'low' },
  ];

  const quickActions = [
    { icon: UserPlus, label: 'Add Client', color: 'from-sky-500 to-blue-500', action: () => setShowAddClientModal(true) },
    { icon: Calendar, label: 'Create Appointment', color: 'from-cyan-500 to-teal-500', action: () => setShowAppointmentModal(true) },
    { icon: FileText, label: 'Add Note', color: 'from-blue-500 to-cyan-500', action: () => setShowAddNoteModal(true) },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-slate-900">Welcome back, Dr. Smith</h1>
        <p className="text-slate-600 mt-1">Here's what's happening with your practice today.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Clients</p>
                <p className="text-slate-900 mt-2">142</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12% from last month</span>
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
                <p className="text-slate-900 mt-2">87</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                  <span>3 ending this week</span>
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
                <p className="text-slate-900 mt-2">28</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>18 completed</span>
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
                <p className="text-slate-900 mt-2">12</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                  <span>4 high priority</span>
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
            {todaysSessions.map((session) => (
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
            ))}
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
            {newRegistrations.map((registration) => (
              <div
                key={registration.id}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                    {registration.name.split(' ').map(n => n[0]).join('')}
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
                  <div className="text-xs text-slate-400">{registration.date}</div>
                </div>
              </div>
            ))}
            <button className="w-full py-3 text-sm text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors">
              View All Registrations →
            </button>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card className="border-slate-200 rounded-2xl">
          <CardHeader className="pb-4">
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="mt-0.5">
                  <div className="w-5 h-5 rounded border-2 border-slate-300 hover:border-cyan-500 transition-colors" />
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
            ))}
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
                  <option>Dr. Rebecca Smith</option>
                  <option>Dr. John Anderson</option>
                  <option>Dr. Sarah Williams</option>
                  <option>Dr. Michael Brown</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Patient Name</label>
                <select
                  value={appointmentClient}
                  onChange={(e) => setAppointmentClient(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="">Select a patient</option>
                  <option value="Sarah Johnson">Sarah Johnson</option>
                  <option value="Michael Chen">Michael Chen</option>
                  <option value="Emily Rodriguez">Emily Rodriguez</option>
                  <option value="David Thompson">David Thompson</option>
                  <option value="Lisa Anderson">Lisa Anderson</option>
                </select>
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
                    min="2025-11-20"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">Min date: Nov 20, 2025</p>
                </div>
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Reminder Time</label>
                  <input
                    type="time"
                    value={noteTime}
                    onChange={(e) => setNoteTime(e.target.value)}
                    min={noteDate === '2025-11-20' ? '15:34' : undefined}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  {noteDate === '2025-11-20' && (
                    <p className="text-xs text-slate-500 mt-1">Min time today: 15:34</p>
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
    </div>
  );
}