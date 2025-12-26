import { useEffect, useState } from 'react';
import { Search, Phone, Mail, Calendar, FileText, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { apiUrl } from '@/config';

export function DoctorMyClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);

  // Add Client form state
  const [clientFirstName, setClientFirstName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientDob, setClientDob] = useState('');
  const [clientGender, setClientGender] = useState('');

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/clients'));
      if (!res.ok) {
        console.error('Failed to fetch clients');
        setClients([]);
        setLoading(false);
        return;
      }
      const data = await res.json();
      const list = (data || []).map((c: any) => ({
        id: c.id || c._id || Math.random(),
        name: `${c.first_name} ${c.last_name}`,
        email: c.email || '',
        phone: c.phone || '',
        status: 'active',
        lastSession: 'N/A',
        nextSession: 'Not scheduled',
        plan: 'Standard Plan',
        sessions: 0,
        image: '',
      }));
      setClients(list);
    } catch (err) {
      console.error('Error fetching clients', err);
      setClients([]);
    }
    setLoading(false);
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
    
    const handler = () => fetchClients();
    window.addEventListener('client:created', handler as EventListener);
    return () => window.removeEventListener('client:created', handler as EventListener);
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-slate-900">My Clients</h1>
          <p className="text-slate-600 mt-1">Manage your assigned clients</p>
        </div>
        <button 
          onClick={() => setShowAddClientModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add New Client
        </button>
      </div>

      <Card className="border-slate-200 rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-xs">
              All Clients ({clients.length})
            </button>
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
              Active
            </button>
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
              New
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-600">Loading clients...</p>
            ) : clients.length === 0 ? (
              <p className="text-slate-600">No clients found.</p>
            ) : (
              clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Avatar className="w-14 h-14">
                    <AvatarImage src={client.image} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                      {client.name.split(' ').map((n: any) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 grid grid-cols-5 gap-4">
                    <div>
                      <div className="text-sm text-slate-900">{client.name}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">Treatment Plan</div>
                      <div className="text-sm text-slate-700 mt-0.5">{client.plan}</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">Sessions</div>
                      <div className="text-sm text-slate-700 mt-0.5">{client.sessions} completed</div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">Next Session</div>
                      <div className="text-sm text-slate-700 mt-0.5">{client.nextSession}</div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Badge
                        variant="outline"
                        className={`${
                          client.status === 'active'
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                            : 'border-cyan-300 text-cyan-700 bg-cyan-50'
                        }`}
                      >
                        {client.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-white rounded-lg transition-colors">
                      <Phone className="w-4 h-4 text-slate-600" />
                    </button>
                    <button className="p-2 hover:bg-white rounded-lg transition-colors">
                      <Mail className="w-4 h-4 text-slate-600" />
                    </button>
                    <button className="p-2 hover:bg-white rounded-lg transition-colors">
                      <FileText className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-900">Progress note added</div>
                <div className="text-xs text-slate-500 mt-0.5">Sarah Johnson • 2 hours ago</div>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-teal-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-900">Session completed</div>
                <div className="text-xs text-slate-500 mt-0.5">Michael Chen • 4 hours ago</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-slate-900">New client assigned</div>
                <div className="text-xs text-slate-500 mt-0.5">David Thompson • 1 day ago</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">This Week's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Monday</span>
                <span className="text-slate-900">4 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Tuesday</span>
                <span className="text-slate-900">5 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Wednesday</span>
                <span className="text-slate-900">6 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Thursday</span>
                <span className="text-slate-900">3 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Friday</span>
                <span className="text-slate-900">4 sessions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Client Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">On Track</span>
                  <span className="text-sm text-slate-900">75%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Needs Attention</span>
                  <span className="text-sm text-slate-900">15%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: '15%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">New Clients</span>
                  <span className="text-sm text-slate-900">10%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">First Name</label>
                  <input
                    type="text"
                    value={clientFirstName}
                    onChange={(e) => setClientFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700 mb-2 block">Last Name</label>
                  <input
                    type="text"
                    value={clientLastName}
                    onChange={(e) => setClientLastName(e.target.value)}
                    placeholder="Doe"
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
                  placeholder="john.doe@example.com"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-sm text-slate-700 mb-2 block">Phone Number</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
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
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
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
                  disabled={!clientFirstName || !clientLastName || !clientEmail}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-sm hover:from-cyan-700 hover:to-teal-700 transition-all disabled:opacity-50"
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
