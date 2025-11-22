import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Mail, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { apiUrl } from '@/config';

interface ClientProfileProps {
  clientId: string | number | undefined;
  onBack?: () => void;
}

export function ClientProfile({ clientId, onBack }: ClientProfileProps) {
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      setError('No client ID provided');
      return;
    }

    const fetchClient = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Fetching client with ID:', clientId);
        const res = await fetch(apiUrl(`/api/clients/${clientId}`));
        console.log('Response status:', res.status);
        
        if (!res.ok) {
          const errText = await res.text();
          console.error('Failed to fetch client:', res.status, errText);
          setError(`Failed to load client: ${res.status}`);
          setClient(null);
          return;
        }
        const data = await res.json();
        console.log('Client data received:', data);
        setClient(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching client:', err);
        setError(`Error loading client: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setClient(null);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        <p className="text-slate-600">No client selected.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        <p className="text-slate-600">Loading client profile...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error || 'Client not found.'}</p>
          <p className="text-xs text-red-600 mt-2">Client ID: {clientId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-cyan-600 hover:text-cyan-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Clients
      </button>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-slate-900 text-2xl">Client Profile</h1>
          <p className="text-slate-600 mt-1">Details and history for the selected client</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 rounded-2xl">
          <CardContent>
            <div className="flex flex-col items-center text-center p-6">
              <Avatar className="w-28 h-28 mb-4">
                {client?.image ? (
                  <AvatarImage src={client.image} />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-teal-500 text-white">
                    {client?.first_name?.[0] || '?'}{client?.last_name?.[0] || ''}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-lg text-slate-900">{client ? `${client.first_name} ${client.last_name}` : '—'}</div>
              <div className="text-sm text-slate-500 mt-1">{client?.email}</div>
              <div className="flex items-center gap-4 mt-4">
                <a href={`tel:${client?.phone}`} className="text-cyan-600 hover:underline flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Call
                </a>
                <a href={`mailto:${client?.email}`} className="text-cyan-600 hover:underline flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">Phone</div>
                  <div className="text-sm text-slate-900">{client?.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Next Session</div>
                  <div className="text-sm text-slate-900">{client?.nextSession || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="text-sm text-slate-900">{client?.status || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Treatment Plan</div>
                  <div className="text-sm text-slate-900">{client?.plan || '—'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle>Activities & Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">No activity to show yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
