import { useEffect, useState } from 'react';
import { Search, Filter, Plus, MoreVertical, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { apiUrl } from '@/config';

export function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      // Normalize backend shape
      const list = (data || []).map((c: any) => ({
        id: c.id || c._id || c._key || Math.random(),
        first_name: c.first_name || c.firstName || '',
        last_name: c.last_name || c.lastName || '',
        email: c.email || '',
        phone: c.phone || '',
        status: c.status || 'active',
        plan: c.plan || '',
        nextSession: c.nextSession || '',
        image: c.image || '',
      }));
      setClients(list);
    } catch (err) {
      console.error('Error fetching clients', err);
      setClients([]);
    }
    setLoading(false);
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
          <h1 className="text-slate-900">Clients</h1>
          <p className="text-slate-600 mt-1">Manage your client roster and view their information</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl hover:from-cyan-700 hover:to-teal-700 transition-all">
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
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-xs">
              All Clients (142)
            </button>
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
              Active (87)
            </button>
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
              Pending (12)
            </button>
            <button className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200">
              Inactive (43)
            </button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <p className="text-slate-600">Loading clients...</p>
            ) : clients.length === 0 ? (
              <p className="text-slate-600">No clients found. Create one to get started.</p>
            ) : (
              clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('navigate:client:profile', { detail: { id: client.id } }));
                  } catch (e) {
                    // ignore
                  }
                }}
              >
                <Avatar className="w-14 h-14">
                  <AvatarImage src={client.image} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                    {`${client.first_name[0] || ''}${client.last_name[0] || ''}`}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-slate-900">{`${client.first_name} ${client.last_name}`}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {client.email}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Phone</div>
                    <div className="text-sm text-slate-700 mt-0.5">{client.phone}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500">Treatment Plan</div>
                    <div className="text-sm text-slate-700 mt-0.5">{client.plan}</div>
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
                          : 'border-amber-300 text-amber-700 bg-amber-50'
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
                    <Calendar className="w-4 h-4 text-slate-600" />
                  </button>
                  <button className="p-2 hover:bg-white rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-slate-600" />
                  </button>
                </div>
              </div>
            ))
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">Showing 1-5 of 142 clients</div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  Previous
                </button>
                <button className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700">
                  Next
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Profile Quick View */}
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
                <div className="text-sm text-slate-900">Intake form submitted</div>
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
                <span className="text-slate-900">6 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Tuesday</span>
                <span className="text-slate-900">5 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Wednesday</span>
                <span className="text-slate-900">7 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Thursday</span>
                <span className="text-slate-900">4 sessions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Friday</span>
                <span className="text-slate-900">6 sessions</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Client Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Individual Therapy</span>
                  <span className="text-sm text-slate-900">62%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500" style={{ width: '62%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Couples Therapy</span>
                  <span className="text-sm text-slate-900">23%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: '23%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Group Sessions</span>
                  <span className="text-sm text-slate-900">15%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: '15%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
