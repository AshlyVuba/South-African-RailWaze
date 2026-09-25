import React, { useEffect, useRef, useState } from 'react';

export interface AudioCapsuleProps {
  audioCapsuleId?: string; // Contract traceability: waypoint.schema.json
  audioUrl: string;
  title: string;
  durationSeconds: number;
  isOpen?: boolean;
  onClose?: () => void;
  /**
   * Optional custom container styling to avoid hardcoding bottom-docking
   * and allow coexistence inside UnifiedViewport slots without drawer collision.
   */
  className?: string;
}

export const AudioCapsule: React.FC<AudioCapsuleProps> = ({
  audioCapsuleId,
  audioUrl,
  title,
  durationSeconds,
  isOpen = true,
  onClose,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Web Audio API refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const setupWebAudio = () => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch {
      // Graceful fallback if Web Audio is unsupported in runtime
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (analyserRef.current && isPlaying) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    } else {
      const progress = durationSeconds > 0 ? currentTime / durationSeconds : 0;
      ctx.fillStyle = '#404040';
      ctx.fillRect(0, height / 2 - 2, width, 4);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, height / 2 - 2, width * Math.min(Math.max(progress, 0), 1), 4);
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current || !isAudioLoaded) return;

    setupWebAudio();
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      drawWaveform();
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    } else {
      drawWaveform();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, currentTime]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const defaultPosition = 'fixed bottom-20 left-4 right-4 pb-safe md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-20';

  return (
    <aside
      aria-label="Audio Capsule Player"
      data-capsule-id={audioCapsuleId}
      className={`${className || defaultPosition} transition-all duration-300 ease-out pointer-events-auto ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'
      }`}
    >
      <div className="bg-neutral-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onCanPlay={() => setIsAudioLoaded(true)}
          onLoadedMetadata={() => setIsAudioLoaded(true)}
          onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              type="button"
              onClick={togglePlay}
              disabled={!isAudioLoaded}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 flex items-center justify-center font-bold transition-colors shrink-0 shadow-md shadow-sky-500/20 focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              {isPlaying ? (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <div className="overflow-hidden">
              <span className="text-xs font-mono tracking-widest uppercase font-semibold text-sky-400 block">
                Folklore Audio
              </span>
              <h4 className="text-base font-semibold tracking-wide text-neutral-100 truncate" title={title}>
                {title}
              </h4>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss audio player"
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-100 hover:bg-white/10 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <canvas
            ref={canvasRef}
            width={320}
            height={28}
            className="w-full h-7 rounded bg-neutral-950/60"
          />
          <div className="flex justify-between text-xs font-mono text-neutral-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};