
import React, { useState, useRef, useEffect } from 'react';

interface VoiceMessageOverlayProps {
  onClose: () => void;
  onSendVoice: (audioBase64: string, mimeType: string) => void;
}

const VoiceMessageOverlay: React.FC<VoiceMessageOverlayProps> = ({ onClose, onSendVoice }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          onSendVoice(base64data, mediaRecorder.mimeType);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTimer(0);
      timerRef.current = window.setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } catch (e) {
      console.error('Recording error', e);
      onClose();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
      <button onClick={onClose} className="absolute top-12 right-12 text-slate-500 hover:text-white transition-all p-4">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <div className="max-w-md w-full flex flex-col items-center text-center space-y-12">
        <div className="relative">
          <div className={`w-48 h-48 rounded-full border-4 transition-all duration-700 flex items-center justify-center ${isRecording ? 'border-red-500 shadow-[0_0_80px_rgba(239,68,68,0.3)]' : 'border-white/10'}`}>
             {isRecording && (
                <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
             )}
             <div className={`w-20 h-20 rounded-2xl transition-all duration-300 ${isRecording ? 'bg-red-500 scale-90' : 'bg-white scale-100'} flex items-center justify-center`}>
                <svg className={`w-10 h-10 ${isRecording ? 'text-white' : 'text-black'}`} fill="currentColor" viewBox="0 0 24 24">
                   <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                   <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
            {isRecording ? 'Recording Prompt' : 'Voice Message Protocol'}
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
            {isRecording ? `TRANSMITTING: ${formatTime(timer)}` : 'EN-UR NEURAL INPUT READY'}
          </p>
        </div>

        {!isRecording ? (
          <button 
            onClick={startRecording}
            className="w-full py-6 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-white/5"
          >
            Start Recording
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="w-full py-6 bg-red-500 text-white text-xs font-black uppercase tracking-[0.2em] rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-red-500/20"
          >
            End and Send
          </button>
        )}

        <div className="flex items-center space-x-3 text-slate-500">
           <span className="w-2 h-2 rounded-full bg-slate-800"></span>
           <p className="text-[9px] font-bold uppercase tracking-widest">
             EN Protocol &rarr; English / UR Protocol &rarr; Hinglish
           </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceMessageOverlay;
