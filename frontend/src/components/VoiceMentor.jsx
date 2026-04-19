import { useState, useRef, useEffect } from 'react';
import { getRealtimeSession } from '../api';

export default function VoiceMentor() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioElRef = useRef(null);
  const canvasRef = useRef(null);
  const analyzerRef = useRef(null);
  const streamRef = useRef(null);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      // 1. Get ephemeral token
      const sessionData = await getRealtimeSession();
      const EPHEMERAL_KEY = sessionData.client_secret.value;

      // 2. Create Peer Connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 3. Set up audio playback
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioElRef.current = audioEl;
      
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
        setupVisualizer(e.streams[0]);
      };

      // 4. Add local microphone track
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = ms;
      pc.addTrack(ms.getTracks()[0]);

      // 5. Set up Data Channel
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;
      
      dc.onmessage = (e) => {
        const serverEvent = JSON.parse(e.data);
        if (serverEvent.type === 'response.audio_transcript.delta') {
          setTranscript(prev => prev + serverEvent.delta);
          setIsAiSpeaking(true);
        }
        if (serverEvent.type === 'response.done') {
          setIsAiSpeaking(false);
        }
      };

      // 6. SDP Negotiation
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);
      
      setIsActive(true);
    } catch (err) {
      console.error('Failed to start voice session:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (pcRef.current) pcRef.current.close();
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsActive(false);
    setTranscript('');
  };

  const setupVisualizer = (stream) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
      if (!isActive && !isConnecting) return;
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

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-surface-container flex flex-col items-center justify-center p-6 border border-outline-variant/20">
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
