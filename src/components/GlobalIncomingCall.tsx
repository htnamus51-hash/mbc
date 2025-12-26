import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { useSocket } from '../hooks/useSocket';
import CallModal from './CallModal';
import { Mic, Video } from 'lucide-react';

interface Props {
  userEmail: string;
}

export default function GlobalIncomingCall({ userEmail }: Props) {
  const [visibleToast, setVisibleToast] = useState(false);
  const [incomingPayload, setIncomingPayload] = useState<any | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const { endCall } = useSocket(userEmail, {} as any);

  useEffect(() => {
    const handler = (e: any) => {
      try {
        const d = e.detail;
        if (!d) return;
        const payload = d.payload || d;
        // payload should include `from` email
        setIncomingPayload(payload);
          setVisibleToast(true);
          // trigger entrance animation
          setTimeout(() => setEntered(true), 20);
      } catch (err) {
        /* ignore */
      }
    };
    window.addEventListener('mbc_incoming_call', handler as EventListener);
    return () => window.removeEventListener('mbc_incoming_call', handler as EventListener);
  }, []);

  const accept = () => {
    setCallOpen(true);
    setVisibleToast(false);
    setEntered(false);
  };

  const decline = () => {
    if (incomingPayload && incomingPayload.from) {
      endCall(incomingPayload.from, incomingPayload.conversation_id, 'declined');
    }
    setIncomingPayload(null);
    setVisibleToast(false);
    setEntered(false);
  };

  return (
    <>
      {visibleToast && incomingPayload && (
        <div style={{ position: 'fixed', right: '1rem', top: '1rem', zIndex: 60, width: 320 }}>
          <div style={{ transform: entered ? 'translateY(0)' : 'translateY(-12px)', opacity: entered ? 1 : 0, transition: 'transform 220ms ease, opacity 220ms ease' }}>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {incomingPayload.meta?.audioOnly ? (
                      <div style={{ width: 48, height: 48, borderRadius: 24, background: '#e6f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Mic size={22} />
                      </div>
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f3f7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Video size={22} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">Incoming {incomingPayload.meta?.audioOnly ? 'audio' : 'video'} call</div>
                    <div className="text-sm text-slate-600">From {incomingPayload.meta?.displayName || incomingPayload.from}</div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2 justify-end">
                  <button onClick={decline} className="px-3 py-2 border rounded">Decline</button>
                  <button onClick={accept} className={incomingPayload.meta?.audioOnly ? 'px-3 py-2 bg-emerald-600 text-white rounded' : 'px-3 py-2 bg-cyan-600 text-white rounded'}>
                    {incomingPayload.meta?.audioOnly ? 'Accept Audio' : 'Accept Video'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {callOpen && incomingPayload && (
        <CallModal
          isOpen={callOpen}
          onClose={() => { setCallOpen(false); setIncomingPayload(null); setEntered(false); }}
          userEmail={userEmail}
          peerEmail={incomingPayload.from}
          conversationId={incomingPayload.conversation_id}
          incomingOffer={incomingPayload}
          audioOnly={!!incomingPayload.meta?.audioOnly}
        />
      )}
    </>
  );
}
