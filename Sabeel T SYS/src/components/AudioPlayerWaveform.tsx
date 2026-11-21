import React, { useEffect, useRef, useState } from 'react';
import { GeneratedVoiceover } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  Download,
  Share2,
  Sliders,
  Sparkles,
  Music,
} from 'lucide-react';

interface AudioPlayerWaveformProps {
  currentVoiceover: GeneratedVoiceover | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  currentTime: number;
  duration: number;
  onOpenExport: () => void;
  onOpenShare: () => void;
  activeLanguage: 'ar' | 'en';
  analyserNode: AnalyserNode | null;
  onVolumeChange?: (vol: number) => void;
}

export const AudioPlayerWaveform: React.FC<AudioPlayerWaveformProps> = ({
  currentVoiceover,
  isPlaying,
  onTogglePlay,
  onSeek,
  currentTime,
  duration,
  onOpenExport,
  onOpenShare,
  activeLanguage,
  analyserNode,
  onVolumeChange,
}) => {
  const isAr = activeLanguage === 'ar';
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volume, setVolume] = useState(1.0);
  const [prevVolume, setPrevVolume] = useState(1.0);

  // Animated Canvas Waveform Visualizer
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Gradient background subtle glow
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(0.5, '#ea580c');
      grad.addColorStop(1, '#f59e0b');

      if (analyserNode && isPlaying) {
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteFrequencyData(dataArray);

        // Draw frequency spectrum bars
        const numBars = 48;
        const barWidth = (width / numBars) * 0.7;
        const barGap = (width / numBars) * 0.3;

        for (let i = 0; i < numBars; i++) {
          const index = Math.floor((i / numBars) * (bufferLength * 0.65));
          const val = dataArray[index] || 0;
          const barHeight = Math.max(4, (val / 255) * (height * 0.85));
          const x = i * (barWidth + barGap);
          const y = (height - barHeight) / 2;

          // Highlight current playback progress
          const progressX = (currentTime / (duration || 1)) * width;
          const isPassed = x <= progressX;

          ctx.fillStyle = isPassed ? grad : 'rgba(71, 85, 105, 0.45)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else {
        // Idle decorative acoustic waveform
        const numBars = 48;
        const barWidth = (width / numBars) * 0.7;
        const barGap = (width / numBars) * 0.3;

        for (let i = 0; i < numBars; i++) {
          // Pre-computed organic curve
          const wave = Math.sin((i / numBars) * Math.PI) * 0.75 + Math.cos(i * 0.4) * 0.25;
          const barHeight = Math.max(6, Math.abs(wave) * (height * 0.65));
          const x = i * (barWidth + barGap);
          const y = (height - barHeight) / 2;

          const progressX = (currentTime / (duration || 1)) * width;
          const isPassed = x <= progressX;

          ctx.fillStyle = isPassed ? grad : 'rgba(51, 65, 85, 0.5)';
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      }
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserNode, isPlaying, currentTime, duration]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * (duration || 1));
  };

  if (!currentVoiceover) {
    return (
      <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-8 text-center backdrop-blur-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500 mb-3.5">
          <Music className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-300">
          {isAr ? 'مشغل الصوت الاستوديو في انتظار التوليد' : 'Studio Master Player Waiting'}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          {isAr
            ? 'اضغط على "توليد التعليق الصوتي" بالأسفل لبدء السرد بالذكاء الاصطناعي بدقة ٤٨ كيلو هرتز'
            : 'Click "Generate Voiceover" to create studio-grade voiceover ready for playback and export.'}
        </p>
      </div>
    );
  }

  return (
    <div
      id="studio-audio-player"
      className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-md shadow-2xl space-y-5"
    >
      {/* Player Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{currentVoiceover.accent.flag}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base sm:text-lg">
                {isAr ? currentVoiceover.accent.nameAr : currentVoiceover.accent.nameEn}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {isAr ? currentVoiceover.persona.nameAr : currentVoiceover.persona.nameEn}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xl">
              "{currentVoiceover.text}"
            </p>
          </div>
        </div>

        {/* Quick Actions (Export & Share) */}
        <div className="flex items-center gap-2">
          <button
            id="btn-open-export"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all"
            title={isAr ? 'خيارات التصدير والتحميل عالي الدقة' : 'High Quality Audio Export & Download'}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isAr ? 'تصدير وتحميل (Export)' : 'Export & Download'}</span>
          </button>

          <button
            id="btn-open-share"
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-semibold text-xs transition-colors"
            title={isAr ? 'مشاركة عبر منصات التواصل' : 'Share on Social Media'}
          >
            <Share2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'مشاركة' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div
        id="waveform-scrub-area"
        onClick={handleScrub}
        className="w-full h-24 sm:h-28 bg-slate-950/80 rounded-2xl border border-slate-800/80 p-2 relative cursor-pointer group flex items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={800}
          height={110}
          className="w-full h-full object-contain"
        />

        {/* Hover Seek Indicator */}
        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>

      {/* Playback Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
        {/* Play/Pause & Time */}
        <div className="flex items-center gap-3.5">
          <button
            id="btn-toggle-play"
            onClick={onTogglePlay}
            className="w-12 h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 transition-transform active:scale-95"
            title={isPlaying ? (isAr ? 'إيقاف مؤقت' : 'Pause') : isAr ? 'تشغيل' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            id="btn-restart-playback"
            onClick={() => onSeek(0)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isAr ? 'إعادة التشغيل من البداية' : 'Restart'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Time Counter */}
          <div className="text-xs font-mono text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-amber-400 font-bold">{formatTime(currentTime)}</span>
            <span className="text-slate-600 mx-1.5">/</span>
            <span>{formatTime(duration || currentVoiceover.durationSeconds || 0)}</span>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800/80">
            <button
              id="btn-toggle-mute"
              onClick={() => {
                if (volume > 0) {
                  setPrevVolume(volume);
                  setVolume(0);
                  onVolumeChange?.(0);
                } else {
                  const restored = prevVolume > 0 ? prevVolume : 1.0;
                  setVolume(restored);
                  onVolumeChange?.(restored);
                }
              }}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title={volume === 0 ? (isAr ? 'إلغاء كتم الصوت' : 'Unmute') : isAr ? 'كتم الصوت' : 'Mute'}
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-400" />
              )}
            </button>
            <input
              id="input-player-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
                if (val > 0) setPrevVolume(val);
                onVolumeChange?.(val);
              }}
              className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-lg accent-amber-500 cursor-pointer"
              title={isAr ? `مستوى الصوت: ${Math.round(volume * 100)}%` : `Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>

        {/* Audio Quality & Master Tags */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300/90">
            {currentVoiceover.exportSettings.sampleRate / 1000} kHz • {currentVoiceover.exportSettings.bitDepth}-bit
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400">
            STUDIO MASTER
          </span>
        </div>
      </div>
    </div>
  );
};
