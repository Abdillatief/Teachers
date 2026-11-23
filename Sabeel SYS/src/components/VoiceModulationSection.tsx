import React from 'react';
import {
  EmotionType,
  VoiceModulationSettings,
  AcousticSpace,
  BreathCadence,
} from '../types';
import { EMOTIONS, PRESET_MODULATIONS } from '../data/accents';
import {
  Sliders,
  Sparkles,
  Volume2,
  Gauge,
  Waves,
  Wind,
  Layers,
  RotateCcw,
  Zap,
  Radio,
  Building,
  Home,
  Music,
} from 'lucide-react';

interface VoiceModulationSectionProps {
  emotion: EmotionType;
  onChangeEmotion: (emotion: EmotionType) => void;
  emotionalIntensity: number;
  onChangeIntensity: (intensity: number) => void;
  modulation: VoiceModulationSettings;
  onChangeModulation: (modulation: VoiceModulationSettings) => void;
  activeLanguage: 'ar' | 'en';
  onAuditionPhrase?: (phrase: string) => void;
  isAuditioning?: boolean;
  lastAuditionedPhrase?: string | null;
  onApplyToScript?: (phrase: string) => void;
}

export const VoiceModulationSection: React.FC<VoiceModulationSectionProps> = ({
  emotion,
  onChangeEmotion,
  emotionalIntensity,
  onChangeIntensity,
  modulation,
  onChangeModulation,
  activeLanguage,
  onAuditionPhrase,
  isAuditioning = false,
  lastAuditionedPhrase,
  onApplyToScript,
}) => {
  const isAr = activeLanguage === 'ar';
  const DEFAULT_TEST_PHRASE = 'فينتو بيحب سلمى اوي';
  const [testPhrase, setTestPhrase] = React.useState<string>(DEFAULT_TEST_PHRASE);
  const [hasTested, setHasTested] = React.useState<boolean>(false);

  const updateSetting = <K extends keyof VoiceModulationSettings>(
    key: K,
    val: VoiceModulationSettings[K]
  ) => {
    onChangeModulation({
      ...modulation,
      [key]: val,
    });
  };

  const handleApplyPreset = (preset: (typeof PRESET_MODULATIONS)[0]) => {
    onChangeModulation({
      ...modulation,
      pitch: preset.pitch,
      speed: preset.speed,
      warmth: preset.warmth,
      clarity: preset.clarity,
      breathCadence: preset.breathCadence,
      acousticSpace: preset.acousticSpace,
      reverbAmount: preset.reverbAmount,
      stability: preset.stability,
    });
  };

  const handleResetDefaults = () => {
    onChangeModulation({
      pitch: 0,
      speed: 1.0,
      warmth: 65,
      clarity: 75,
      breathCadence: 'natural',
      acousticSpace: 'dry_studio',
      reverbAmount: 12,
      stability: 85,
    });
    onChangeIntensity(75);
    onChangeEmotion('neutral');
  };

  const getIntensityLabel = (val: number) => {
    if (val < 30) return isAr ? 'هادئ وخفيف (Subtle)' : 'Subtle & Mild';
    if (val < 65) return isAr ? 'متزن وطبيعي (Balanced)' : 'Natural Balance';
    if (val < 85) return isAr ? 'تمثيلي معبّر (Expressive)' : 'Expressive Acting';
    return isAr ? 'درامي مكثف أقصى طاقة (High Drama)' : 'Peak Dramatic Power';
  };

  const acousticSpaces: { id: AcousticSpace; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'dry_studio', labelAr: 'غرفة عزل (Dry Studio)', labelEn: 'Dry Studio', icon: Radio },
    { id: 'broadcast_chamber', labelAr: 'استوديو إذاعي', labelEn: 'Broadcast Booth', icon: Building },
    { id: 'warm_room', labelAr: 'غرفة دافئة', labelEn: 'Warm Living Room', icon: Home },
    { id: 'auditorium', labelAr: 'قاعة سينمائية', labelEn: 'Cinema Auditorium', icon: Music },
  ];

  return (
    <div
      id="voice-modulation-container"
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-sm space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isAr ? 'تعديل نبرة الصوت والمشاعر (Voice Modulation)' : 'Custom Voice Modulation & Emotions'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تحكم دقيق في المشاعر، طبقة الصوت، السرعة، دفء الرخامة، وصدى الفضاء الصوتي'
              : 'Precision control over emotions, pitch, tempo, warmth, and acoustic reverb'}
          </p>
        </div>

        {/* Quick Presets & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="btn-reset-modulation"
            onClick={handleResetDefaults}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-colors"
            title={isAr ? 'استعادة الإعدادات الافتراضية' : 'Reset to default settings'}
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>{isAr ? 'إعادة ضبط' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* FEATURE: LIVE AUDITION TEST SECTION (خاصية التجربة الفورية) */}
      <div
        id="audition-test-box"
        className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900/90 to-slate-950 border-2 border-amber-500/40 shadow-xl space-y-3.5 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-300">
                  {isAr ? 'خاصية التجربة الحية (Live Voice Audition)' : 'Live Voice Audition'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {isAr ? 'تجربة سريعة' : 'Instant Test'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'عدّل الخيارات بالأسفل وجرّب النبرة فوراً على هذه الجملة حتى تصل للنتيجة المطلوبة'
                  : 'Adjust modulation below and audition on this test phrase until perfected'}
              </p>
            </div>
          </div>

          {/* Restore default test phrase button */}
          <button
            type="button"
            onClick={() => setTestPhrase(DEFAULT_TEST_PHRASE)}
            className="text-[11px] text-amber-400/80 hover:text-amber-300 self-start sm:self-auto underline decoration-dotted flex items-center gap-1"
          >
            <span>{isAr ? 'استعادة: "فينتو بيحب سلمى اوي"' : 'Reset test phrase'}</span>
          </button>
        </div>

        {/* Test Phrase Input & Audition Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <input
              id="input-audition-phrase"
              type="text"
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
              placeholder="فينتو بيحب سلمى اوي"
              dir="rtl"
              className="w-full bg-slate-950 border-2 border-amber-500/40 rounded-xl px-4 py-2.5 text-sm font-bold text-amber-100 placeholder-amber-400/50 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20"
            />
            {testPhrase !== DEFAULT_TEST_PHRASE && (
              <button
                type="button"
                onClick={() => setTestPhrase(DEFAULT_TEST_PHRASE)}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-0.5 rounded-md border border-slate-700"
              >
                فينتو
              </button>
            )}
          </div>

          <button
            id="btn-trigger-audition"
            type="button"
            disabled={isAuditioning || !testPhrase.trim()}
            onClick={() => {
              if (onAuditionPhrase && testPhrase.trim()) {
                setHasTested(true);
                onAuditionPhrase(testPhrase.trim());
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shrink-0 ${
              isAuditioning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
                : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-amber-500/25 active:scale-95'
            }`}
          >
            {isAuditioning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-amber-300" />
                <span>{isAr ? 'جاري تجربة النبرة...' : 'Auditioning Voice...'}</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? '🔊 جرّب النبرة الحالية الآن' : '🔊 Audition Now'}</span>
              </>
            )}
          </button>

          {onApplyToScript && (
            <button
              type="button"
              onClick={() => onApplyToScript(testPhrase)}
              title={isAr ? 'نقل هذه الجملة إلى محرر النص الرئيسي' : 'Use this phrase in main script'}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold shrink-0 transition-colors"
            >
              {isAr ? 'نقل للنص الرئيسي' : 'Send to Editor'}
            </button>
          )}
        </div>

        {/* Real-time status / audit feedback */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1">
          <div className="text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isAr
                ? `النبرة الحالية: ${modulation.pitch > 0 ? `+${modulation.pitch}` : modulation.pitch}st طبقة • ${modulation.speed.toFixed(2)}x سرعة • ${modulation.warmth}% دفء`
                : `Current: ${modulation.pitch}st pitch • ${modulation.speed}x tempo • ${modulation.warmth}% warmth`}
            </span>
          </div>

          {lastAuditionedPhrase && (
            <span className="text-amber-300 font-medium">
              {isAr ? `✓ تم تجربة: "${lastAuditionedPhrase}"` : `✓ Auditioned: "${lastAuditionedPhrase}"`}
            </span>
          )}
        </div>
      </div>

      {/* Preset Modulation Templates */}
      <div>
        <span className="text-xs font-semibold text-slate-300 mb-2.5 block">
          {isAr ? 'قوالب جاهزة سريعة:' : 'Quick Style Presets:'}
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESET_MODULATIONS.map((preset, idx) => (
            <button
              key={idx}
              id={`preset-mod-${idx}`}
              onClick={() => handleApplyPreset(preset)}
              className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-500/50 text-start transition-all group"
            >
              <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 truncate">
                {isAr ? preset.nameAr : preset.nameEn}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {preset.speed}x • {preset.pitch > 0 ? `+${preset.pitch}` : preset.pitch}st
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 1. EMOTIONAL INTENSITY & STYLE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">
              {isAr ? 'الحالة الشعورية والإحساس' : 'Emotional Style'}
            </span>
          </div>
          <span className="text-xs text-amber-400 font-semibold">
            {isAr ? 'شدة التعبير: ' : 'Intensity: '}
            <strong className="text-white font-bold">{emotionalIntensity}%</strong>
          </span>
        </div>

        {/* Emotion Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {EMOTIONS.map((item) => {
            const isSelected = emotion === item.id;
            return (
              <button
                key={item.id}
                id={`emotion-btn-${item.id}`}
                onClick={() => onChangeEmotion(item.id)}
                className={`p-2.5 rounded-xl border text-xs text-start transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500/40 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold truncate">{isAr ? item.labelAr : item.labelEn}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {item.descriptionAr}
                </div>
              </button>
            );
          })}
        </div>

        {/* Emotional Intensity Slider */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{isAr ? 'مستوى الانفعال الصوتي' : 'Emotional Expression Level'}</span>
            <span className="text-amber-300 font-medium">{getIntensityLabel(emotionalIntensity)}</span>
          </div>
          <input
            id="slider-emotional-intensity"
            type="range"
            min="0"
            max="100"
            value={emotionalIntensity}
            onChange={(e) => onChangeIntensity(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      {/* 2. ACOUSTIC MODULATION GRID (Pitch, Speed, Warmth, Clarity) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pitch */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-white flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'طبقة الصوت (Pitch)' : 'Pitch Shift'}</span>
            </span>
            <span className="text-amber-400 font-mono">
              {modulation.pitch > 0 ? `+${modulation.pitch}` : modulation.pitch} st
            </span>
          </div>
          <input
            id="slider-pitch"
            type="range"
            min="-6"
            max="6"
            step="0.5"
            value={modulation.pitch}
            onChange={(e) => updateSetting('pitch', Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{isAr ? 'جهوري/Bass' : 'Deep'}</span>
            <span>{isAr ? 'طبيعي' : 'Natural'}</span>
            <span>{isAr ? 'حاد/Tenor' : 'Bright'}</span>
          </div>
        </div>

        {/* Speed / Tempo */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-white flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'السرعة والإيقاع' : 'Speed / Tempo'}</span>
            </span>
            <span className="text-amber-400 font-mono">{modulation.speed.toFixed(2)}x</span>
          </div>
          <input
            id="slider-speed"
            type="range"
            min="0.6"
            max="1.75"
            step="0.05"
            value={modulation.speed}
            onChange={(e) => updateSetting('speed', Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0.6x ({isAr ? 'هادئ' : 'Slow'})</span>
            <span>1.0x</span>
            <span>1.75x ({isAr ? 'سريع' : 'Fast'})</span>
          </div>
        </div>

        {/* Warmth / Low-end tube body */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'الدفء والرنين (Warmth)' : 'Vocal Warmth'}</span>
            </span>
            <span className="text-amber-400 font-mono">{modulation.warmth}%</span>
          </div>
          <input
            id="slider-warmth"
            type="range"
            min="0"
            max="100"
            value={modulation.warmth}
            onChange={(e) => updateSetting('warmth', Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{isAr ? 'صافٍ' : 'Clear'}</span>
            <span>{isAr ? 'دافئ' : 'Warm'}</span>
            <span>{isAr ? 'رنان إذاعي' : 'Deep Tube'}</span>
          </div>
        </div>

        {/* Clarity / High-mid presence */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'الوضوح ومخارج الحروف' : 'Articulation & Clarity'}</span>
            </span>
            <span className="text-amber-400 font-mono">{modulation.clarity}%</span>
          </div>
          <input
            id="slider-clarity"
            type="range"
            min="0"
            max="100"
            value={modulation.clarity}
            onChange={(e) => updateSetting('clarity', Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>{isAr ? 'ناعم' : 'Smooth'}</span>
            <span>{isAr ? 'واضح' : 'Articulate'}</span>
            <span>{isAr ? 'حاد الحروف' : 'Crisp Air'}</span>
          </div>
        </div>
      </div>

      {/* 3. BREATHING CADENCE & ACOUSTIC SPACE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Breathing Cadence */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'وتيرة التنفس والوقفات' : 'Breathing & Pauses Cadence'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'tight', labelAr: 'مكثف (إعلانات)', labelEn: 'Tight / Ads' },
                { id: 'natural', labelAr: 'طبيعي وحواري', labelEn: 'Natural' },
                { id: 'dramatic', labelAr: 'وقفات درامية', labelEn: 'Dramatic' },
              ] as const
            ).map((cadence) => {
              const isSelected = modulation.breathCadence === cadence.id;
              return (
                <button
                  key={cadence.id}
                  onClick={() => updateSetting('breathCadence', cadence.id)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isAr ? cadence.labelAr : cadence.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Acoustic Space & Reverb */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="flex justify-between items-center text-xs font-semibold text-white">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'الفضاء الصوتي وصدى الغرفة' : 'Acoustic Room & Reverb'}</span>
            </span>
            <span className="text-amber-400 font-mono">{modulation.reverbAmount}%</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {acousticSpaces.map((space) => {
              const isSelected = modulation.acousticSpace === space.id;
              return (
                <button
                  key={space.id}
                  onClick={() => updateSetting('acousticSpace', space.id)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] truncate font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {isAr ? space.labelAr : space.labelEn}
                </button>
              );
            })}
          </div>

          <input
            id="slider-reverb"
            type="range"
            min="0"
            max="60"
            value={modulation.reverbAmount}
            onChange={(e) => updateSetting('reverbAmount', Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>
    </div>
  );
};
