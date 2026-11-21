import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  title: string;
  voiceName?: string;
  onDownloadMp3?: () => void;
  onDownloadWav?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duration = 0,
  title,
  voiceName,
  onDownloadMp3,
  onDownloadWav,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && (!totalDuration || isNaN(totalDuration) || totalDuration === 0)) {
      setTotalDuration(audioRef.current.duration || duration || 5);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="audio-preview-player" className="bg-white rounded-2xl border border-sky-100 p-5 shadow-xs transition-all">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-sky-600 tracking-wide">الملف الصوتي جاهز للمعاينة</span>
          </div>
          <h4 className="text-base font-bold text-slate-800 mt-1 line-clamp-1">{title || 'تعليق صوتي مصري جديد'}</h4>
          {voiceName && <p className="text-xs text-slate-500">بصوت: {voiceName}</p>}
        </div>

        {/* Action downloads */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="download-wav-btn"
            onClick={onDownloadWav}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border border-sky-200 text-sky-700 bg-sky-50/50 hover:bg-sky-100/70 active:scale-95 transition-all"
            title="تحميل بجودة الاستوديو العالية WAV"
          >
            <Download className="w-3.5 h-3.5 text-sky-600" />
            <span>تحميل WAV</span>
          </button>
          <button
            id="download-mp3-btn"
            onClick={onDownloadMp3}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl bg-sky-500 text-white hover:bg-sky-600 active:scale-95 shadow-xs shadow-sky-200 transition-all"
            title="تحميل بتنسيق مضغوط MP3"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تحميل MP3</span>
          </button>
        </div>
      </div>

      {/* Waveform & Scrubber */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <button
            id="audio-play-toggle-btn"
            onClick={togglePlay}
            className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 active:scale-95 shadow-xs transition-all flex-shrink-0"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleRestart}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all flex-shrink-0"
            title="إعادة من البداية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <input
              id="audio-seeker"
              type="range"
              min={0}
              max={totalDuration || 10}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 pr-2 border-r border-slate-100">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              className="w-16 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
