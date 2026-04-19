import { useState, useRef, useEffect } from 'react';
import { getRealtimeSession } from '../api';

export default function VoiceMentor({ sessionId, autoStart = false, onStatusChange, onStop, onTranscriptUpdate }) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioElRef = useRef(null);
  const canvasRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const isActiveRef = useRef(false);
  const connectingRef = useRef(false);

  // Track conversation turns for feedback
  const conversationRef = useRef([]);
  const currentAiTextRef = useRef('');
  const currentUserTextRef = useRef('');

  useEffect(() => {
    if (autoStart && sessionId) {
      startSession();
    }
    return () => {
      isActiveRef.current = false;
      connectingRef.current = false;
      if (pcRef.current) pcRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
      pcRef.current = null;
      streamRef.current = null;
      audioCtxRef.current = null;
    };
  }, [sessionId, autoStart]);

  const startSession = async () => {
    if (connectingRef.current || isActiveRef.current) return;
    connectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    try {
      const sessionData = await getRealtimeSession(sessionId);
      console.log('Realtime session response:', sessionData);

      if (!sessionData?.client_secret?.value) {
        throw new Error('Backend did not return a valid ephemeral key');
      }
      const EPHEMERAL_KEY = sessionData.client_secret.value;

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.onconnectionstatechange = () => {
        console.log('WebRTC connection state:', pc.connectionState);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setError('Voice connection lost — try reconnecting');
          stopSession();
        }
      };

      const audioEl = audioElRef.current;
      pc.ontrack = (e) => {
        console.log('WebRTC track received:', e.track.kind, 'streams:', e.streams.length);
        audioEl.srcObject = e.streams[0];
        audioEl.play().catch(err => console.error('Audio play failed:', err));
        setupVisualizer(e.streams[0]);
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('Data channel open — configuring VAD');
        dc.send(JSON.stringify({
          type: 'session.update',
          session: {
            turn_detection: {
              type: 'server_vad',
              threshold: 0.8,
              prefix_padding_ms: 500,
              silence_duration_ms: 1500,
            },
          },
        }));
      };

      dc.onmessage = (e) => {
        try {
          const ev = JSON.parse(e.data);

          // AI is speaking — accumulate transcript
          if (ev.type === 'response.audio_transcript.delta') {
            currentAiTextRef.current += ev.delta;
            setTranscript(currentAiTextRef.current);
            setIsAiSpeaking(true);
            onStatusChange?.({ isActive: true, isAiSpeaking: true });
          }

          // AI finished a response — save this turn
          if (ev.type === 'response.done') {
            if (currentAiTextRef.current.trim()) {
              conversationRef.current.push({
                role: 'assistant',
                text: currentAiTextRef.current.trim(),
              });
              onTranscriptUpdate?.(conversationRef.current);
            }
            currentAiTextRef.current = '';
            setIsAiSpeaking(false);
            onStatusChange?.({ isActive: true, isAiSpeaking: false });
          }

          // User speech transcription
          if (ev.type === 'conversation.item.input_audio_transcription.completed') {
            const userText = ev.transcript?.trim();
            if (userText) {
              conversationRef.current.push({
                role: 'user',
                text: userText,
              });
              onTranscriptUpdate?.(conversationRef.current);
            }
          }

        } catch (parseErr) {
          console.warn('Failed to parse data channel message:', parseErr);
        }
      };

      dc.onerror = (e) => {
        console.error('Data channel error:', e);
        setError('Voice data channel error');
      };

      dc.onclose = () => {
        console.log('Data channel closed');
        if (isActiveRef.current) {
          setError('Voice connection closed unexpectedly');
          stopSession();
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(`OpenAI Realtime SDP failed: ${sdpResponse.status}`);
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      console.log('WebRTC connection established');

      isActiveRef.current = true;
      setIsActive(true);
      onStatusChange?.({ isActive: true, isAiSpeaking: false });
    } catch (err) {
      console.error('Failed to start voice session:', err);
      setError(err.message || 'Failed to connect');
      connectingRef.current = false;
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    isActiveRef.current = false;
    connectingRef.current = false;
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close();
    pcRef.current = null;
    streamRef.current = null;
    audioCtxRef.current = null;
    setIsActive(false);
    setTranscript('');
    onStatusChange?.({ isActive: false, isAiSpeaking: false });
    onStop?.(conversationRef.current);
  };

  const setupVisualizer = (stream) => {
    if (audioCtxRef.current) audioCtxRef.current.close();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);
    analyzerRef.current = analyzer;
    draw();
  };

  const draw = () => {
    if (!canvasRef.current || !analyzerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyzer = analyzerRef.current;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      if (!isActiveRef.current) return;
      requestAnimationFrame(renderFrame);
      analyzer.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgba(105, 246, 184, ${barHeight / 100})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    renderFrame();
  };

  // Embedded mode (Interview page)
  if (autoStart) {
    return (
      <>
        <audio ref={audioElRef} autoPlay style={{ display: 'none' }} />
        {error && (
          <div className="w-full bg-error-container/30 border border-error/20 p-4 rounded-lg text-center">
            <p className="text-sm text-error mb-3">{error}</p>
            <button
              onClick={startSession}
              disabled={isConnecting}
              className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold text-sm hover:opacity-90 transition-all"
            >
              {isConnecting ? 'Reconnecting...' : 'Retry Connection'}
            </button>
          </div>
        )}
        {!isActive && !error && (
          <div className="w-full text-center py-4">
            <div className="flex items-center justify-center gap-3">
              <span className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></span>
              <span className="text-sm text-on-surface-variant font-[Manrope] font-medium">
                Connecting to interviewer...
              </span>
            </div>
          </div>
        )}
        {isActive && (
          <div className="w-full space-y-4">
            <canvas ref={canvasRef} width="400" height="150" className="w-full max-w-lg mx-auto" />
            <div className="w-full bg-surface-container-low/80 backdrop-blur-sm p-4 rounded-lg border border-outline-variant/10 min-h-[80px]">
              <p className="text-sm text-on-surface font-medium italic">
                {isAiSpeaking ? transcript : 'Listening...'}
              </p>
            </div>
          </div>
        )}
      </>
    );
  }

  // Standalone mode (Onboarding page)
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-surface-container flex flex-col items-center justify-center p-6 border border-outline-variant/20">
      <audio ref={audioElRef} autoPlay style={{ display: 'none' }} />
      {!isActive ? (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <span className="material-symbols-outlined text-primary text-5xl">graphic_eq</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-[Manrope] font-bold text-on-surface">AI Voice Mentor</h3>
            <p className="text-sm text-on-surface-variant max-w-xs">
              Practice your pitch and answers with our AI mentor in real-time.
            </p>
          </div>
          {error && (
            <p className="text-sm text-error bg-error-container/30 px-4 py-2 rounded-lg max-w-xs">{error}</p>
          )}
          <button
            onClick={startSession}
            disabled={isConnecting}
            className="px-8 py-3 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
          >
            {isConnecting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-on-primary border-t-transparent rounded-full"></span>
                Connecting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">mic</span>
                Start Practice
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-between relative">
          <div className="absolute top-0 right-0">
            <button onClick={stopSession} className="p-2 text-on-surface-variant hover:text-error transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="flex-1 w-full flex items-center justify-center">
            <canvas ref={canvasRef} width="400" height="150" className="w-full max-w-sm" />
          </div>
          <div className="w-full bg-surface-container-low/80 backdrop-blur-sm p-4 rounded-lg border border-outline-variant/10 min-h-[80px]">
            <p className="text-sm text-on-surface font-medium italic">
              {isAiSpeaking ? transcript : "Listening..."}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(105,246,184,0.8)]"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Live Session</span>
          </div>
        </div>
      )}
    </div>
  );
}
