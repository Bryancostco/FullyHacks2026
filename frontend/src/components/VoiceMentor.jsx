import { useState, useRef, useEffect } from 'react';
import { getRealtimeSession } from '../api';

export default function VoiceMentor({ sessionId, autoStart = false, onStatusChange, onStop, onTurnAdded, stopRef, realtimeSession }) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const audioElRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const isActiveRef = useRef(false);
  const turnsRef = useRef([]);

  // Expose stopSession to parent
  useEffect(() => {
    if (stopRef) stopRef.current = stopSession;
  });

  useEffect(() => {
    if (autoStart && sessionId) startSession();
    return () => cleanup();
  }, [sessionId, autoStart]);

  const cleanup = () => {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    isActiveRef.current = false;
  };

  const startSession = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // Use pre-fetched session if available, otherwise fetch now
      let sessionData = realtimeSession;
      if (!sessionData) {
        sessionData = await getRealtimeSession(sessionId);
      }

      if (!sessionData?.client_secret?.value) {
        throw new Error('No ephemeral key returned from backend');
      }
      const ephemeralKey = sessionData.client_secret.value;

      // WebRTC setup
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected'].includes(pc.connectionState)) {
          setError('Voice connection lost');
          stopSession();
        }
      };

      const audioEl = audioElRef.current;
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch(err => console.warn('Audio play blocked:', err));
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      ms.getTracks().forEach(t => pc.addTrack(t, ms));

      const dc = pc.createDataChannel('oai-events');

      dc.onopen = () => {
        console.log('Data channel open');
        // Configure session and explicitly enable input transcription
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['audio', 'text'],
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.6,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
            },
          },
        }));
        // Give server 300ms to process then trigger AI to speak first
        setTimeout(() => {
          console.log('Sending response.create');
          dc.send(JSON.stringify({ type: 'response.create' }));
        }, 300);
      };

      dc.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);

          if (ev.type === 'response.audio_transcript.delta') {
            setTranscript(prev => prev + ev.delta);
            setIsAiSpeaking(true);
            onStatusChange?.({ isActive: true, isAiSpeaking: true });
          }

          if (ev.type === 'response.done') {
            setIsAiSpeaking(false);
            setTranscript('');
            onStatusChange?.({ isActive: true, isAiSpeaking: false });
            // Capture full AI turn
            for (const item of ev.response?.output || []) {
              for (const part of item.content || []) {
                if (part.transcript) {
                  const turn = { role: 'ai', text: part.transcript };
                  turnsRef.current.push(turn);
                  onTurnAdded?.(turn);
                }
              }
            }
          }

          // Capture user's transcribed speech
          if (ev.type === 'conversation.item.input_audio_transcription.completed') {
            const text = ev.transcript?.trim();
            if (text) {
              const turn = { role: 'user', text };
              turnsRef.current.push(turn);
              onTurnAdded?.(turn);
            }
          }

          if (ev.type === 'error') {
            console.error('OpenAI Realtime error:', ev.error);
          }
        } catch (err) {
          console.warn('Failed to parse DC message:', err);
        }
      };

      dc.onerror = (e) => { console.error('DC error:', e); setError('Voice channel error'); };
      dc.onclose = () => { if (isActiveRef.current) { setError('Connection closed'); stopSession(); } };

      // SDP negotiation
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
        method: 'POST',
        body: offer.sdp,
        headers: { Authorization: `Bearer ${ephemeralKey}`, 'Content-Type': 'application/sdp' },
      });

      if (!sdpRes.ok) throw new Error(`SDP failed: ${sdpRes.status}`);

      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });

      isActiveRef.current = true;
      setIsActive(true);
      onStatusChange?.({ isActive: true, isAiSpeaking: false });
    } catch (err) {
      console.error('Voice session failed:', err);
      setError(err.message || 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    cleanup();
    setIsActive(false);
    setTranscript('');
    onStatusChange?.({ isActive: false, isAiSpeaking: false });
    onStop?.();
  };

  // Embedded mode (Interview page)
  if (autoStart) {
    return (
      <>
        <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />
        {error && (
          <div className="w-full bg-error-container/30 border border-error/20 p-4 rounded-lg text-center">
            <p className="text-sm text-error mb-3">{error}</p>
            <button onClick={startSession} disabled={isConnecting}
              className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold text-sm">
              {isConnecting ? 'Reconnecting...' : 'Retry'}
            </button>
          </div>
        )}
        {!isActive && !error && (
          <div className="w-full text-center py-4 flex items-center justify-center gap-3">
            <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
            <span className="text-sm text-on-surface-variant">Connecting to interviewer...</span>
          </div>
        )}
        {isActive && (
          <div className="w-full bg-surface-container-low/80 p-4 rounded-lg min-h-[60px] flex items-center">
            <p className="text-sm text-on-surface italic">
              {isAiSpeaking ? transcript || '...' : 'Listening...'}
            </p>
          </div>
        )}
      </>
    );
  }

  // Standalone widget (Onboarding page)
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-surface-container flex flex-col items-center justify-center p-6 border border-outline-variant/20">
      <audio ref={audioElRef} autoPlay playsInline style={{ display: 'none' }} />
      {!isActive ? (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <span className="material-symbols-outlined text-primary text-5xl">graphic_eq</span>
          </div>
          <h3 className="text-xl font-[Manrope] font-bold text-on-surface">AI Voice Mentor</h3>
          <p className="text-sm text-on-surface-variant">Practice with our AI mentor in real-time.</p>
          {error && <p className="text-sm text-error bg-error-container/30 px-4 py-2 rounded-lg">{error}</p>}
          <button onClick={startSession} disabled={isConnecting}
            className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold flex items-center gap-2 mx-auto">
            {isConnecting
              ? <><span className="animate-spin h-4 w-4 border-2 border-on-primary border-t-transparent rounded-full" />Connecting...</>
              : <><span className="material-symbols-outlined">mic</span>Start Practice</>}
          </button>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-4">
          <button onClick={stopSession} className="self-end p-2 text-on-surface-variant hover:text-error">
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="w-full bg-surface-container-low/80 p-4 rounded-lg min-h-[80px]">
            <p className="text-sm italic text-on-surface">{isAiSpeaking ? transcript : 'Listening...'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Live</span>
          </div>
        </div>
      )}
    </div>
  );
}
