import React, { useState, useEffect } from 'react';
import { Play, Volume2, Sliders, Check } from 'lucide-react';
import { VoicePersona, TonePreset, VoiceClone } from '../types';
import { EGYPTIAN_VOICES, TONE_OPTIONS } from '../data/voices';
import { speakTextDirect, initSpeechVoices } from '../lib/audioEngine';

interface VoiceControlPanelProps {
  selectedVoiceId: string;
  onSelectVoiceId: (id: string) => void;
  selectedTone: TonePreset;
  onSelectTone: (tone: TonePreset) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  pitch: number;
  onChangePitch: (pitch: number) => void;
  emotion: number;
  onChangeEmotion: (emotion: number) => void;
  customClones: VoiceClone[];
  onOpenCloneModal: () => void;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  selectedVoiceId,
  onSelectVoiceId,
  selectedTone,
  onSelectTone,
  speed,
  onChangeSpeed,
  pitch,
  onChangePitch,
  emotion,
  onChangeEmotion,
  customClones,
  onOpenCloneModal,
}) => {
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    initSpeechVoices().catch(() => {});
  }, []);

  const handleTestVoice = (voice: VoicePersona, e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      setPreviewingVoiceId(null);
      window.speechSynthesis?.cancel();
      return;
    }

    setPreviewingVoiceId(voice.id);
    speakTextDirect(
      voice.sampleText,
      voice,
      selectedTone,
      speed,
      pitch,
      () => setPreviewingVoiceId(voice.id),
      () => setPreviewingVoiceId(null)
    );
  };

  return (
    <div id="voice-control-panel" className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">لوحة التحكم بالصوت</h3>
            <p className="text-[11px] text-slate-400">اختر الشخصية المصرية وضبط معايير الأداء</p>
          </div>
        </div>
      </div>

      {/* Voice Personas selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">الشخصية الصوتية (أصوات مصرية متقنة):</label>
          <span className="text-[10px] text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-full">
            {EGYPTIAN_VOICES.length + customClones.length} أصوات متاحة
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
          {EGYPTIAN_VOICES.map((v) => {
            const isSelected = v.id === selectedVoiceId;
            const isTesting = previewingVoiceId === v.id;

            return (
              <div
                key={v.id}
                onClick={() => onSelectVoiceId(v.id)}
                className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                  isSelected
                    ? 'border-sky-400 bg-sky-50/50 shadow-2xs'
                    : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-2xl mt-0.5 select-none">{v.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-800">{v.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-200/70 text-slate-600">
                        {v.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-2">
                      {v.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleTestVoice(v, e)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-medium flex items-center gap-1 transition-all ${
                      isTesting
                        ? 'bg-sky-500 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-sky-600 hover:border-sky-300'
                    }`}
                    title="تجربة عينة صوتية"
                  >
                    <Play className={`w-3 h-3 ${isTesting ? 'fill-current animate-pulse' : ''}`} />
                    <span>{isTesting ? 'جاري الاستماع...' : 'تجربة'}</span>
                  </button>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Custom Clones if any */}
          {customClones.map((clone) => {
            const isSelected = clone.id === selectedVoiceId;
            return (
              <div
                key={clone.id}
                onClick={() => onSelectVoiceId(clone.id)}
                className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-50/50 shadow-2xs'
                    : 'border-slate-100 bg-slate-50/40 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-2xl mt-0.5 select-none">✨</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-800">{clone.name}</h4>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-700">
                        مستنسخ ({clone.similarityScore}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug line-clamp-1">
                      {clone.description}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tone Presets */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-700 block">التحكم في النبرة (Tone Presets):</label>
        <div className="grid grid-cols-3 gap-2">
          {TONE_OPTIONS.map((t) => {
            const isSelected = t.id === selectedTone;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTone(t.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl text-center border transition-all ${
                  isSelected
                    ? 'bg-sky-500 text-white border-sky-500 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-sky-200 hover:bg-sky-50/30'
                }`}
              >
                <span className="text-base select-none">{t.icon}</span>
                <span className="text-xs font-bold mt-0.5">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders for Speed, Pitch, Emotion */}
      <div className="space-y-3.5 pt-2 border-t border-slate-100">
        {/* Speed */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700">سرعة الصوت (Speed)</span>
            <span className="font-mono text-sky-600 font-bold">{speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min={0.7}
            max={1.5}
            step={0.05}
            value={speed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>هادئ (0.7x)</span>
            <span>طبيعي (1.0x)</span>
            <span>سريع (1.5x)</span>
          </div>
        </div>

        {/* Pitch */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700">درجة الصوت (Pitch)</span>
            <span className="font-mono text-sky-600 font-bold">{pitch.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={pitch}
            onChange={(e) => onChangePitch(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>قرار عميق</span>
            <span>متوسط</span>
            <span>جواب رفيع</span>
          </div>
        </div>

        {/* Emotion */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-700">مستوى التعبير (Emotion)</span>
            <span className="font-mono text-sky-600 font-bold">{(emotion * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            value={emotion}
            onChange={(e) => onChangeEmotion(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>هادئ متزن</span>
            <span>متفاعل</span>
            <span>حماسي عالي</span>
          </div>
        </div>
      </div>
    </div>
  );
};
