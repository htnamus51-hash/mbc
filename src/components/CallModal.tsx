import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { X, Phone, VideoOff, Video, Mic } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { messagingApi } from '../services/messagingApi';
import { TURN_SERVERS } from '../config';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  peerEmail: string;
  conversationId?: string;
  inviteOnly?: boolean;
  incomingOffer?: any; // offer payload when incoming
  audioOnly?: boolean;
}

function buildIceConfig(): RTCConfiguration {
  const defaultStun: RTCIceServer = { urls: 'stun:stun.l.google.com:19302' };
  const servers = TURN_SERVERS && TURN_SERVERS.length > 0 ? [defaultStun, ...TURN_SERVERS] : [defaultStun];
  return { iceServers: servers };
}

export default function CallModal({ isOpen, onClose, userEmail, peerEmail, conversationId, incomingOffer, audioOnly = false }: CallModalProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const demoAudioCtxRef = useRef<AudioContext | null>(null);
  const demoOscRef = useRef<OscillatorNode | null>(null);
  const demoAnimRef = useRef<number | null>(null);
  const { sendOffer, sendAnswer, sendIce, endCall } = useSocket(userEmail, {} as any);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string | null>(null);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  // default remote audio unmuted so participants can hear each other after accept
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [statusText, setStatusText] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startLocalStream() {
    try {
      console.log('[CallModal] requesting local media');
      setStatusText('Requesting camera & microphone...');
      // Check available media devices first to provide a better error message
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('MediaDevices API not available in this browser');
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      // update device lists for the device selection UI
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      const hasAudioInput = devices.some((d) => d.kind === 'audioinput');
      const hasVideoInput = devices.some((d) => d.kind === 'videoinput');
      if (audioOnly) {
        if (!hasAudioInput) {
          const msg = 'No microphone found. Please connect a microphone and allow permissions.';
          console.warn('[CallModal] no audio devices', devices);
          setStatusText(msg);
          throw new Error(msg);
        }
      } else {
        if (!hasAudioInput && !hasVideoInput) {
          const msg = 'No camera or microphone found. Please connect a device and allow permissions.';
          console.warn('[CallModal] no media devices', devices);
          setStatusText(msg);
          // Return early by throwing so callers can show UI
          throw new Error(msg);
        }
      }

      // prefer specific devices if selected
      const audioConstraint: any = hasAudioInput ? (selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true) : false;
      const videoConstraint: any = (!audioOnly && hasVideoInput) ? (selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true) : false;
      const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: videoConstraint });
      localStreamRef.current = s;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = s;
        try { await localVideoRef.current.play(); } catch (e) { /* autoplay may be blocked */ }
      }
      console.log('[CallModal] local stream obtained', s);
      setStatusText('Local media ready');
      return s;
    } catch (e) {
      console.error('getUserMedia failed', e);
      const msg = (e && (e as any).message) || String(e);
      setStatusText('Failed to get media: ' + msg);
      // rethrow so callers (createPeerAndOffer / handleIncomingOffer) can abort gracefully
      throw e;
    }
  }

  // Create synthetic demo MediaStream (canvas video + oscillator audio) for testing without hardware
  function createSyntheticStream(): MediaStream {
    // Create or reuse a hidden canvas
    let canvas = demoCanvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      demoCanvasRef.current = canvas;
    }

    const ctx = canvas.getContext('2d')!;
    let t = 0;
    const draw = () => {
      t += 0.04;
      ctx.fillStyle = `hsl(${(t * 40) % 360}, 70%, 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.fillText('Demo Camera', 10, 30);
      ctx.fillText(new Date().toLocaleTimeString(), 10, 60);
    };
    // start animation
    if (demoAnimRef.current) cancelAnimationFrame(demoAnimRef.current);
    const anim = () => { draw(); demoAnimRef.current = requestAnimationFrame(anim); };
    demoAnimRef.current = requestAnimationFrame(anim);

    const canvasStream = (canvas as HTMLCanvasElement).captureStream(15);

    // Audio: oscillator into MediaStreamDestination
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ac = new AudioCtx();
    demoAudioCtxRef.current = ac;
    const osc = ac.createOscillator();
    demoOscRef.current = osc;
    const dst = ac.createMediaStreamDestination();
    osc.type = 'sine';
    osc.frequency.value = 440;
    osc.connect(dst);
    try { osc.start(); } catch (e) { /* may throw if suspended */ }

    const audioStream = dst.stream;

    // combine
    const combined = new MediaStream();
    // include video track unless audioOnly is true
    if (!audioOnly) {
      canvasStream.getVideoTracks().forEach((t) => combined.addTrack(t));
    }
    audioStream.getAudioTracks().forEach((t) => combined.addTrack(t));

    return combined;
  }

  function stopSyntheticStream() {
    try {
      if (demoAnimRef.current) cancelAnimationFrame(demoAnimRef.current);
      demoAnimRef.current = null;
      if (demoOscRef.current) {
        try { demoOscRef.current.stop(); } catch (e) {}
        demoOscRef.current.disconnect();
        demoOscRef.current = null;
      }
      if (demoAudioCtxRef.current) {
        try { demoAudioCtxRef.current.close(); } catch (e) {}
        demoAudioCtxRef.current = null;
      }
      if (demoCanvasRef.current) {
        // leave canvas element to be reused
      }
    } catch (e) {
      console.warn('stopSyntheticStream failed', e);
    }
  }

  // Retry attempt triggered from UI: re-check devices and retry call flow
  async function retryLocalMediaAndRetryCall() {
    setStatusText('Re-checking devices...');
    try {
      await startLocalStream();
      setStatusText('Local media available. Retrying call...');
      // If this tab is the caller and modal is open, start outbound; if incomingOffer present, answer
      if (!incomingOffer) {
        // small delay to let media attach
        setTimeout(() => {
          createPeerAndOffer().catch((e) => console.error('Retry createPeerAndOffer failed', e));
        }, 100);
      } else {
        // answer the incoming offer
        setTimeout(() => {
          handleIncomingOffer(incomingOffer).catch((e) => console.error('Retry handleIncomingOffer failed', e));
        }, 100);
      }
    } catch (e) {
      const msg = (e && (e as any).message) || String(e);
      setStatusText('Still no devices: ' + msg);
    }
  }

  async function createPeerAndOffer() {
    setIsCalling(true);
    const pc = new RTCPeerConnection(buildIceConfig());
    pcRef.current = pc;

    pc.ontrack = (ev) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = ev.streams[0];
        try { remoteVideoRef.current.play(); } catch (e) { /* autoplay may be blocked */ }
        // ensure remote element muted state matches control
        remoteVideoRef.current.muted = isRemoteMuted;
      }
      console.log('[CallModal] ontrack - remote stream attached', ev.streams[0]);
      try { console.log('[CallModal] remote stream tracks', ev.streams[0].getTracks().map(t=>({kind:t.kind, id:t.id}))); } catch(e){}
      setStatusText('Remote media received');
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendIce(peerEmail, ev.candidate, conversationId);
        console.log('[CallModal] local ICE candidate', ev.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      try { console.log('[CallModal] ICE connection state changed:', pc.iceConnectionState); } catch (e) {}
    };
    pc.onconnectionstatechange = () => {
      try { console.log('[CallModal] PeerConnection connectionState:', (pc as any).connectionState || pc.iceConnectionState); } catch (e) {}
    };

    let stream: MediaStream | null = null;
    try {
      stream = await startLocalStream();
    } catch (e) {
      // if no real devices, fall back to synthetic demo stream (for testing)
      console.warn('[CallModal] startLocalStream failed, creating synthetic demo stream for testing', e);
      stream = createSyntheticStream();
    }
    try {
      console.log('[CallModal] adding local tracks', stream.getTracks().map(t=>({kind:t.kind,id:t.id})));
    } catch(e){}
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log('[CallModal] created local offer', offer);
    // send offer to peer
    sendOffer(peerEmail, offer, conversationId);
    setStatusText('Offer sent');
  }

  async function startRecording() {
    if (!localStreamRef.current && !remoteVideoRef.current?.srcObject) {
      console.warn('No media available to record');
      return;
    }

    // Combine local and remote tracks into a single MediaStream for recording
    const combined = new MediaStream();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => combined.addTrack(t));
    }
    const remoteStream = remoteVideoRef.current?.srcObject as MediaStream | null;
    if (remoteStream) {
      remoteStream.getTracks().forEach((t) => combined.addTrack(t));
    }

    // Choose a mime type supported by the browser
    const mimeTypeCandidates = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'audio/webm',
    ];
    let mimeType = '';
    for (const m of mimeTypeCandidates) {
      if ((window as any).MediaRecorder && (window as any).MediaRecorder.isTypeSupported && (window as any).MediaRecorder.isTypeSupported(m)) {
        mimeType = m;
        break;
      }
    }

    try {
      const options = mimeType ? { mimeType } : undefined;
      const mr = new MediaRecorder(combined, options as MediaRecorderOptions | undefined);
      recorderRef.current = mr;
      recordedChunksRef.current = [];

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType || 'video/webm' });
        const filename = `recording_${Date.now()}.webm`;
        const file = new File([blob], filename, { type: blob.type });

        try {
          const meta = await messagingApi.uploadFile(file);
          console.log('Recording uploaded', meta);
        } catch (e) {
          console.error('Failed to upload recording', e);
        } finally {
          setIsRecording(false);
        }
      };

      mr.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start MediaRecorder', e);
    }
  }

  function stopRecording() {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
    } catch (e) {
      console.error('Failed to stop recorder', e);
      setIsRecording(false);
    }
  }

  async function handleIncomingOffer(offer: any) {
    setIsCalling(true);
    const pc = new RTCPeerConnection(buildIceConfig());
    pcRef.current = pc;

    pc.ontrack = (ev) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = ev.streams[0];
        try { remoteVideoRef.current.play(); } catch (e) { /* autoplay may be blocked */ }
        remoteVideoRef.current.muted = isRemoteMuted;
      }
      console.log('[CallModal] ontrack (answerer) - remote stream attached', ev.streams[0]);
      try { console.log('[CallModal] remote stream tracks (answerer)', ev.streams[0].getTracks().map(t=>({kind:t.kind, id:t.id}))); } catch(e){}
      setStatusText('Remote media received');
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendIce(offer.from, ev.candidate, conversationId);
        console.log('[CallModal] answerer local ICE candidate', ev.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      try { console.log('[CallModal] (answerer) ICE connection state changed:', pc.iceConnectionState); } catch (e) {}
    };
    pc.onconnectionstatechange = () => {
      try { console.log('[CallModal] (answerer) PeerConnection connectionState:', (pc as any).connectionState || pc.iceConnectionState); } catch (e) {}
    };

    let stream: MediaStream | null = null;
    try {
      stream = await startLocalStream();
    } catch (e) {
      console.warn('[CallModal] startLocalStream failed for answerer, creating synthetic demo stream', e);
      stream = createSyntheticStream();
    }
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    await pc.setRemoteDescription(new RTCSessionDescription(offer.sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendAnswer(offer.from, answer, conversationId);
    console.log('[CallModal] answered offer with local answer', answer);
    setStatusText('Answered call');
  }

  // Called by external hook when remote sends answer
  async function handleRemoteAnswer(answer: any) {
    try {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer.sdp));
        console.log('[CallModal] remote answer set', answer);
        setStatusText('Call established');
      }
    } catch (e) {
      console.error('Failed to set remote answer', e);
      setStatusText('Failed to set remote answer: ' + (e && (e as any).message));
    }
  }

  async function handleRemoteIce(candidate: any) {
    try {
      if (pcRef.current) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        console.log('[CallModal] added remote ICE candidate', candidate);
      }
    } catch (e) {
      console.error('Failed to add ICE', e);
      setStatusText('Failed to add ICE: ' + (e && (e as any).message));
    }
  }

  function hangup() {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      endCall(peerEmail, conversationId, 'hangup');
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalling(false);
      onClose();
      setStatusText('Call ended');
    }
  }

  function cleanup() {
    try {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      stopSyntheticStream();
    } catch (e) {
      /* ignore */
    }
  }

  // Accept incoming offer if provided
  useEffect(() => {
    if (incomingOffer) {
      handleIncomingOffer(incomingOffer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingOffer]);

  // If modal opened by caller (no incomingOffer), start outbound call
  useEffect(() => {
    if (isOpen && !incomingOffer && peerEmail && !isCalling) {
      // small delay to allow modal mount
      const t = setTimeout(() => {
        createPeerAndOffer().catch((e) => console.error('Failed to start outbound call', e));
      }, 100);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, incomingOffer, peerEmail]);

  // Listen for answer/ice events forwarded via window events
  useEffect(() => {
    const onAnswer = (e: any) => {
      const payload = e.detail;
      if (payload && payload.from === peerEmail) {
        handleRemoteAnswer(payload);
      }
    };
    const onIce = (e: any) => {
      const payload = e.detail;
      if (payload && payload.from === peerEmail) {
        handleRemoteIce(payload.candidate || payload.candidate);
      }
    };
    const onEnd = (e: any) => {
      const payload = e.detail;
      if (payload && payload.from === peerEmail) {
        // remote ended call
        cleanup();
        onClose();
      }
    };

    window.addEventListener('mbc_call_answer', onAnswer as EventListener);
    window.addEventListener('mbc_call_ice', onIce as EventListener);
    window.addEventListener('mbc_call_end', onEnd as EventListener);

    return () => {
      window.removeEventListener('mbc_call_answer', onAnswer as EventListener);
      window.removeEventListener('mbc_call_ice', onIce as EventListener);
      window.removeEventListener('mbc_call_end', onEnd as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerEmail]);

  return !isOpen ? null : (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="w-[900px] max-w-full">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="font-semibold">Call with {peerEmail}</div>
            <div className="flex items-center gap-2">
              <button onClick={hangup} className="p-2 bg-red-500 text-white rounded inline-flex items-center gap-2">
                <X className="w-4 h-4" /> End
              </button>
            </div>
          </div>

          {!audioOnly ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black h-64 flex items-center justify-center relative">
                  <video ref={remoteVideoRef} autoPlay playsInline muted={isRemoteMuted} className="w-full h-full object-cover" />
                  <button
                    onClick={() => {
                      const newVal = !isRemoteMuted;
                      setIsRemoteMuted(newVal);
                      try {
                        if (remoteVideoRef.current) remoteVideoRef.current.muted = newVal;
                      } catch (e) {}
                    }}
                    className="absolute left-2 top-2 p-2 bg-white rounded"
                    title="Toggle remote audio"
                  >
                    {isRemoteMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
                <div className="bg-slate-100 h-64 flex items-center justify-center relative">
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Device selection dropdowns */}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs">Microphone:</label>
                  <select
                    value={selectedAudioDeviceId ?? ''}
                    onChange={(e) => setSelectedAudioDeviceId(e.target.value || null)}
                    className="border px-2 py-1 rounded text-sm"
                  >
                    <option value="">Default</option>
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs">Camera:</label>
                  <select
                    value={selectedVideoDeviceId ?? ''}
                    onChange={(e) => setSelectedVideoDeviceId(e.target.value || null)}
                    className="border px-2 py-1 rounded text-sm"
                  >
                    <option value="">Default</option>
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                    ))}
                  </select>
                </div>

                <button onClick={() => { try { (async () => await refreshDevices())(); } catch(e){} }} className="px-3 py-1 border rounded text-sm">Refresh</button>
              </div>
            </>
          ) : (
            <div className="mt-2 flex items-center gap-6">
              <div className="flex-1 flex flex-col items-center">
                <div style={{ width: 160, height: 160, borderRadius: 80, background: '#f3f9f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={60} />
                </div>
                <div className="mt-3 font-semibold">Audio Call</div>
                <div className="text-sm text-slate-600">{peerEmail}</div>
                <div className="mt-4">
                  <button
                    onClick={() => {
                      const newMute = !isMuted;
                      if (localStreamRef.current) localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !newMute));
                      setIsMuted(newMute);
                    }}
                    className="px-4 py-2 bg-slate-100 rounded"
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>

              <div className="w-56">
                <div className="text-xs">Microphone:</div>
                <select
                  value={selectedAudioDeviceId ?? ''}
                  onChange={(e) => setSelectedAudioDeviceId(e.target.value || null)}
                  className="w-full border px-2 py-1 rounded text-sm mt-1"
                >
                  <option value="">Default</option>
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                  ))}
                </select>
                <div className="mt-2">
                  <button onClick={() => { try { (async () => await refreshDevices())(); } catch(e){} }} className="px-3 py-1 border rounded text-sm">Refresh</button>
                </div>
              </div>
            </div>
          )}

          {/* Helpful status + retry UI when devices are missing */}
          {statusText && statusText.toLowerCase().includes('no camera') && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded text-sm text-slate-700 flex items-center justify-between">
              <div>
                <div className="font-medium">No camera or microphone detected</div>
                <div className="text-xs mt-1">Please connect a device and allow camera/microphone access for this site.</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => retryLocalMediaAndRetryCall()} className="px-3 py-2 bg-cyan-600 text-white rounded">Retry</button>
                <button onClick={() => { setStatusText('Please check browser/site camera & microphone permissions.'); }} className="px-3 py-2 bg-white border rounded">Help</button>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                const prev = isMuted;
                const newMute = !prev;
                // when muted=true we should disable local audio tracks
                if (localStreamRef.current) {
                  localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !newMute));
                }
                setIsMuted(newMute);
              }}
              className="p-3 bg-slate-100 rounded"
            >
              {isMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
