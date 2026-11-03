import React, { useState, useEffect, useRef } from 'react';
import { soundEngine } from '../utils/audioEngine';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  CloudRain,
  Waves,
  Headphones,
  Wind,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface FocusSuiteProps {
  completedSessions: number;
  totalFocusMinutes: number;
  onSessionComplete: (minutes: number) => void;
}

type TimerMode = 'focus' | 'short_break' | 'long_break';

export const FocusSuite: React.FC<FocusSuiteProps> = ({
  completedSessions,
  totalFocusMinutes,
  onSessionComplete,
}) => {
  // Timer States
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customFocusMinutes, setCustomFocusMinutes] = useState(25);

  // Audio Soundscape Sliders (0 - 100)
  const [rainVol, setRainVol] = useState(0);
  const [binauralVol, setBinauralVol] = useState(0);
  const [oceanVol, setOceanVol] = useState(0);
  const [noiseVol, setNoiseVol] = useState(0);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Interval reference
  const intervalRef = useRef<number | null>(null);

  const getDurationForMode = (mode: TimerMode): number => {
    switch (mode) {
      case 'focus':
        return customFocusMinutes * 60;
      case 'short_break':
        return 5 * 60;
      case 'long_break':
        return 15 * 60;
    }
  };

  const currentTotalDuration = getDurationForMode(timerMode);

  // Switch Mode
  const handleModeChange = (mode: TimerMode) => {
    setTimerMode(mode);
    setIsRunning(false);
    setTimeLeft(getDurationForMode(mode));
  };

  // Timer Tick Effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer Finished!
            soundEngine.playChime();
            setIsRunning(false);

            if (timerMode === 'focus') {
              onSessionComplete(customFocusMinutes);
              // Switch to short or long break
              const nextMode = (completedSessions + 1) % 4 === 0 ? 'long_break' : 'short_break';
              setTimerMode(nextMode);
              return getDurationForMode(nextMode);
            } else {
              setTimerMode('focus');
              return customFocusMinutes * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timerMode, customFocusMinutes, completedSessions, onSessionComplete]);

  // Audio Engine Synchronization
  useEffect(() => {
    if (isAudioMuted) {
      soundEngine.stopAll();
    } else {
      soundEngine.setRain(rainVol / 100);
      soundEngine.setBinaural(binauralVol / 100);
      soundEngine.setOcean(oceanVol / 100);
      soundEngine.setNoise(noiseVol / 100);
    }
  }, [rainVol, binauralVol, oceanVol, noiseVol, isAudioMuted]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopAll();
    };
  }, []);

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(getDurationForMode(timerMode));
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (timerMode === 'focus') {
      handleModeChange('short_break');
    } else {
      handleModeChange('focus');
    }
  };

  // Preset Soundscape Quick-Loads
  const applyPreset = (preset: 'deep_flow' | 'rainy_library' | 'ocean_breeze' | 'silent') => {
    setIsAudioMuted(false);
    switch (preset) {
      case 'deep_flow':
        setRainVol(25);
        setBinauralVol(70);
        setOceanVol(0);
        setNoiseVol(20);
        break;
      case 'rainy_library':
        setRainVol(80);
        setBinauralVol(20);
        setOceanVol(0);
        setNoiseVol(10);
        break;
      case 'ocean_breeze':
        setRainVol(10);
        setBinauralVol(30);
        setOceanVol(80);
        setNoiseVol(0);
        break;
      case 'silent':
        setRainVol(0);
        setBinauralVol(0);
        setOceanVol(0);
        setNoiseVol(0);
        break;
    }
  };

  // Format Time M:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // SVG Progress Ring calculations
  const progressRatio = (currentTotalDuration - timeLeft) / currentTotalDuration;
  const strokeDashoffset = 2 * Math.PI * 110 * (1 - progressRatio);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-6xl mx-auto py-2">
      {/* Left Column: Pomodoro Focus Engine (7 cols) */}
      <div className="lg:col-span-7 flex flex-col items-center justify-between p-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
        {/* Mode Switcher */}
        <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl mb-8">
          <button
            onClick={() => handleModeChange('focus')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              timerMode === 'focus'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Focus (25m)
          </button>
          <button
            onClick={() => handleModeChange('short_break')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              timerMode === 'short_break'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Short Break (5m)
          </button>
          <button
            onClick={() => handleModeChange('long_break')}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              timerMode === 'long_break'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            Long Break (15m)
          </button>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative flex items-center justify-center my-4">
          <svg className="w-64 h-64 -rotate-90">
            {/* Background Circle */}
            <circle
              cx="128"
              cy="128"
              r="110"
              className="stroke-neutral-100 dark:stroke-neutral-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <circle
              cx="128"
              cy="128"
              r="110"
              className="stroke-neutral-900 dark:stroke-neutral-100 transition-all duration-300"
              strokeWidth="6"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 110}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>

          {/* Central Time Readout */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-5xl font-mono font-bold tracking-tight text-neutral-900 dark:text-neutral-50 tabular-nums">
              {formattedTime}
            </span>
            <span className="text-xs font-medium text-neutral-400 mt-2 uppercase tracking-wider">
              {timerMode === 'focus' ? 'Deep Work Block' : 'Recovery Interval'}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={handleReset}
            title="Reset interval"
            className="p-3 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="flex items-center justify-center w-14 h-14 text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white rounded-full shadow-md transition-all active:scale-95"
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>

          <button
            onClick={handleSkip}
            title="Skip to next"
            className="p-3 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Subtle Stats Row */}
        <div className="flex items-center gap-6 mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500 font-mono tabular-nums">
          <span>{completedSessions} sessions completed</span>
          <span aria-hidden="true">·</span>
          <span>{totalFocusMinutes} minutes total</span>
        </div>
      </div>

      {/* Right Column: Audio Atmosphere Synthesizer Deck (5 cols) */}
      <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs space-y-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Atmosphere Synthesizer
              </h3>
              <p className="text-xs text-neutral-400">
                Procedural Web Audio · Zero streaming delays
              </p>
            </div>

            <button
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-2 rounded-lg transition-colors ${
                isAudioMuted
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
              title={isAudioMuted ? 'Unmute Atmosphere' : 'Mute Atmosphere'}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick Soundscape Presets */}
          <div className="mt-4">
            <span className="text-[11px] font-medium text-neutral-500 mb-2 block">
              Curated Presets
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => applyPreset('deep_flow')}
                className="px-3 py-2 text-xs font-medium text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 transition-colors"
              >
                Deep Flow (Alpha 10Hz)
              </button>
              <button
                onClick={() => applyPreset('rainy_library')}
                className="px-3 py-2 text-xs font-medium text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 transition-colors"
              >
                Rainy Library
              </button>
              <button
                onClick={() => applyPreset('ocean_breeze')}
                className="px-3 py-2 text-xs font-medium text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 transition-colors"
              >
                Oceanic Swell
              </button>
              <button
                onClick={() => applyPreset('silent')}
                className="px-3 py-2 text-xs font-medium text-left bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60 transition-colors text-neutral-500"
              >
                Silence All
              </button>
            </div>
          </div>

          {/* Audio Sliders List */}
          <div className="space-y-4 mt-6">
            {/* 1. Rain */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-neutral-400" />
                  Rain & Precipitation
                </span>
                <span className="font-mono text-neutral-400 tabular-nums">{rainVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={rainVol}
                onChange={(e) => {
                  setRainVol(Number(e.target.value));
                  setIsAudioMuted(false);
                }}
                className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none"
              />
            </div>

            {/* 2. Binaural Beat */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Headphones className="w-3.5 h-3.5 text-neutral-400" />
                  Alpha Waves (10Hz Binaural)
                </span>
                <span className="font-mono text-neutral-400 tabular-nums">{binauralVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={binauralVol}
                onChange={(e) => {
                  setBinauralVol(Number(e.target.value));
                  setIsAudioMuted(false);
                }}
                className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none"
              />
            </div>

            {/* 3. Ocean */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-neutral-400" />
                  Ocean Low-Frequency Swell
                </span>
                <span className="font-mono text-neutral-400 tabular-nums">{oceanVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={oceanVol}
                onChange={(e) => {
                  setOceanVol(Number(e.target.value));
                  setIsAudioMuted(false);
                }}
                className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none"
              />
            </div>

            {/* 4. Pink Noise */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-neutral-400" />
                  Pink Noise Mask
                </span>
                <span className="font-mono text-neutral-400 tabular-nums">{noiseVol}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={noiseVol}
                onChange={(e) => {
                  setNoiseVol(Number(e.target.value));
                  setIsAudioMuted(false);
                }}
                className="w-full accent-neutral-900 dark:accent-neutral-100 cursor-pointer h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Headphone Recommendation Note */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 leading-relaxed">
          Tip: Stereo headphones are recommended for binaural alpha waves to deliver discrete 200Hz/210Hz differential frequencies to each ear.
        </div>
      </div>
    </div>
  );
};
