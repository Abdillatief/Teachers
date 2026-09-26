import React, { useState, useEffect, useRef } from 'react';
import { FocusSession, Task, AmbientSoundType } from '../types';
import { soundscape } from '../utils/audioSynth';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  CloudRain, 
  Waves, 
  Activity, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Headphones
} from 'lucide-react';

interface FocusDeckProps {
  focusSession: FocusSession;
  onUpdateFocusSession: (session: FocusSession) => void;
  tasks: Task[];
  theme: 'dark' | 'light';
  onNavigateToBoard: () => void;
}

export const FocusDeck: React.FC<FocusDeckProps> = ({
  focusSession,
  onUpdateFocusSession,
  tasks,
  theme,
  onNavigateToBoard,
}) => {
  const [isPlaying, setIsPlaying] = useState(focusSession.isActive);
  const [remainingSeconds, setRemainingSeconds] = useState(focusSession.remainingSeconds);
  const [selectedSound, setSelectedSound] = useState<AmbientSoundType>(focusSession.soundType);
  const [volume, setVolume] = useState<number>(focusSession.soundVolume);
  const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>(focusSession.linkedTaskId);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const activeTask = tasks.find((t) => t.id === linkedTaskId);

  // Timer tick interval
  useEffect(() => {
    let timer: number | null = null;
    if (isPlaying && remainingSeconds > 0) {
      timer = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            // Trigger completion
            soundscape.playTimerBell();
            const nextCycles = focusSession.completedCyclesToday + 1;
            onUpdateFocusSession({
              ...focusSession,
              isActive: false,
              completedCyclesToday: nextCycles,
              remainingSeconds: focusSession.durationMinutes * 60,
            });
            setIsPlaying(false);
            return focusSession.durationMinutes * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, remainingSeconds, focusSession, onUpdateFocusSession]);

  // Handle ambient sound playback
  useEffect(() => {
    if (isPlaying && selectedSound !== 'none') {
      soundscape.play(selectedSound, volume);
    } else {
      soundscape.stop();
    }
    return () => {
      soundscape.stop();
    };
  }, [isPlaying, selectedSound, volume]);

  // Audio frequency visualizer
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderVisualizer = () => {
      if (!soundscape.analyser || !isPlaying || selectedSound === 'none') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw idle baseline line
        ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      const bufferLength = soundscape.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      soundscape.analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;

        ctx.fillStyle = theme === 'dark' ? '#3b82f6' : '#2563eb';
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animFrameRef.current = requestAnimationFrame(renderVisualizer);
    };

    renderVisualizer();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, selectedSound, theme]);

  const togglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    onUpdateFocusSession({
      ...focusSession,
      isActive: nextState,
      remainingSeconds,
      soundType: selectedSound,
      soundVolume: volume,
      linkedTaskId,
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    soundscape.stop();
    const secs = focusSession.durationMinutes * 60;
    setRemainingSeconds(secs);
    onUpdateFocusSession({
      ...focusSession,
      isActive: false,
      remainingSeconds: secs,
    });
  };

  const setPresetMode = (mode: 'focus' | 'short_break' | 'long_break', minutes: number) => {
    setIsPlaying(false);
    soundscape.stop();
    const secs = minutes * 60;
    setRemainingSeconds(secs);
    onUpdateFocusSession({
      ...focusSession,
      mode,
      durationMinutes: minutes,
      remainingSeconds: secs,
      isActive: false,
    });
  };

  // Format mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Circular progress math
  const totalSecs = focusSession.durationMinutes * 60;
  const progressPercent = totalSecs > 0 ? (totalSecs - remainingSeconds) / totalSecs : 0;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressPercent * circumference;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto min-h-0 select-none">
      <div className="w-full max-w-xl flex flex-col items-center">
        {/* Preset mode tabs */}
        <div className={`p-1 rounded-lg border flex items-center gap-1 mb-8 text-xs ${
          theme === 'dark' ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <button
            onClick={() => setPresetMode('focus', 25)}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              focusSession.mode === 'focus' && focusSession.durationMinutes === 25
                ? theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-neutral-100 text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            25m Focus
          </button>
          <button
            onClick={() => setPresetMode('focus', 50)}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              focusSession.mode === 'focus' && focusSession.durationMinutes === 50
                ? theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-neutral-100 text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            50m Deep Architecture
          </button>
          <button
            onClick={() => setPresetMode('short_break', 5)}
            className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
              focusSession.mode === 'short_break'
                ? theme === 'dark' ? 'bg-neutral-800 text-white shadow-sm' : 'bg-neutral-100 text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            5m Recharge
          </button>
        </div>

        {/* Circular Timer Visualizer */}
        <div className="relative w-72 h-72 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            {/* Background track */}
            <circle
              cx="144"
              cy="144"
              r={radius}
              stroke={theme === 'dark' ? '#262626' : '#e5e5e5'}
              strokeWidth="6"
              fill="none"
            />
            {/* Active progress */}
            <circle
              cx="144"
              cy="144"
              r={radius}
              stroke="#3b82f6"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-linear"
            />
          </svg>

          {/* Center Digital Display */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-bold tracking-tight tabular-nums text-neutral-900 dark:text-white">
              {timeFormatted}
            </span>
            <span className="text-xs uppercase tracking-wider text-neutral-500 mt-2 font-medium">
              {focusSession.mode === 'focus' ? 'Flow Session' : 'Recharge Break'}
            </span>
          </div>
        </div>

        {/* Primary Timer Controls */}
        <div className="flex items-center gap-4 mt-8">
          <button
            onClick={handleReset}
            className={`p-3 rounded-full border transition-colors ${
              theme === 'dark' ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600'
            }`}
            title="Reset Timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-transform active:scale-95"
            title={isPlaying ? 'Pause' : 'Start Focus'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
        </div>

        {/* Ambient Synthesizer Deck */}
        <div className={`w-full mt-10 p-5 rounded-xl border transition-colors ${
          theme === 'dark' ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Web Audio Soundscape Generator
              </span>
            </div>

            {/* Audio wave canvas visualizer */}
            <canvas
              ref={visualizerCanvasRef}
              width={100}
              height={20}
              className="rounded opacity-80"
            />
          </div>

          {/* Sound preset selectors */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { id: 'binaural', label: '432Hz Alpha' },
              { id: 'rain', label: 'Rain & Thunder' },
              { id: 'waves', label: 'Ocean Waves' },
              { id: 'brown', label: 'Warm Brown' },
            ].map((sound) => {
              const isSelected = selectedSound === sound.id;
              return (
                <button
                  key={sound.id}
                  onClick={() => {
                    const next = selectedSound === sound.id ? 'none' : (sound.id as AmbientSoundType);
                    setSelectedSound(next);
                  }}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : theme === 'dark'
                        ? 'border-neutral-800 hover:border-neutral-700 text-neutral-400'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                  }`}
                >
                  <p className="truncate">{sound.label}</p>
                  <span className="text-[10px] text-neutral-500">
                    {isSelected && isPlaying ? 'Active' : 'Offline Synth'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <Volume2 className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <span className="font-mono tabular-nums text-[11px] w-8 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>

        {/* Linked Task Context Banner */}
        <div className={`w-full mt-4 p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
          theme === 'dark' ? 'bg-neutral-900/40 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
        }`}>
          <div className="flex items-center gap-3 truncate">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] text-neutral-500 font-mono">LINKED SPRINT GOAL</span>
              <p className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                {activeTask ? activeTask.title : 'No specific task linked for this session'}
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToBoard}
            className="flex items-center gap-1 text-blue-500 hover:text-blue-400 shrink-0 font-medium hover:underline"
          >
            <span>Change</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Unboxed Daily Completed Telemetry */}
        <div className="mt-6 flex items-center gap-4 text-xs text-neutral-500 font-mono tabular-nums">
          <span>Today: {focusSession.completedCyclesToday} cycles completed</span>
          <span aria-hidden="true">·</span>
          <span>Total Deep Work: {(focusSession.completedCyclesToday * 25) / 60 >= 1 ? `${((focusSession.completedCyclesToday * 25) / 60).toFixed(1)} hrs` : `${focusSession.completedCyclesToday * 25} mins`}</span>
        </div>
      </div>
    </div>
  );
};
