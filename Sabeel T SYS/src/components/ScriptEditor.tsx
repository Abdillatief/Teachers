import React from 'react';
import { VoiceAccent, EmotionType, VoicePersona } from '../types';
import { Sparkles, Wand2, RefreshCw, FileText, CheckCircle2, Clock } from 'lucide-react';

interface ScriptEditorProps {
  script: string;
  onChangeScript: (newScript: string) => void;
  selectedAccent: VoiceAccent;
  selectedPersona?: VoicePersona;
  activeLanguage: 'ar' | 'en';
  emotion: EmotionType;
  emotionalIntensity: number;
  speed: number;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  script,
  onChangeScript,
  selectedAccent,
  selectedPersona,
  activeLanguage,
  emotion,
  emotionalIntensity,
  speed,
}) => {
  const isAr = activeLanguage === 'ar';
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [enhanceNotes, setEnhanceNotes] = React.useState<{
    dialectNotes?: string;
    vocalDirectorAdvice?: string;
  } | null>(null);

  // Approximate duration calculation:
  // In Arabic, average reading speed is ~120 to 140 words per minute at 1.0x speed
  const words = script.trim() ? script.trim().split(/\s+/).length : 0;
  const chars = script.length;
  const estimatedSeconds = words > 0 ? Math.round((words / (130 / 60)) / speed) : 0;

  const handleLoadSample = () => {
    onChangeScript(selectedAccent.sampleScriptAr);
    setEnhanceNotes(null);
  };

  const handleEnhanceScript = async () => {
    if (!script.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await fetch('/api/enhance-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          accentId: selectedAccent.id,
          emotion,
          intensity: emotionalIntensity,
        }),
      });
      const data = await res.json();
      if (data.enhancedText) {
        onChangeScript(data.enhancedText);
        setEnhanceNotes({
          dialectNotes: data.dialectNotes,
          vocalDirectorAdvice: data.vocalDirectorAdvice,
        });
      }
    } catch (err) {
      console.error('Enhance script error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-sm flex flex-col justify-between">
      <div>
        {/* Header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              {isAr ? 'نص التعليق الصوتي (السكريبت)' : 'Voiceover Script'}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Test Phrase button */}
            <button
              id="btn-load-test-phrase"
              onClick={() => {
                onChangeScript('فينتو بيحب سلمى اوي');
                setEnhanceNotes(null);
              }}
              className="text-xs px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors flex items-center gap-1.5 font-bold"
              title={isAr ? 'تجربة جملة: فينتو بيحب سلمى اوي' : 'Test sentence'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'تجربة: "فينتو بيحب سلمى اوي"' : 'Test Phrase'}</span>
            </button>

            {/* Persona Sample Script if available */}
            {selectedPersona?.samplePhraseAr && (
              <button
                id="btn-load-persona-phrase"
                onClick={() => {
                  onChangeScript(selectedPersona.samplePhraseAr!);
                  setEnhanceNotes(null);
                }}
                className="text-xs px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition-colors flex items-center gap-1.5 font-medium"
                title={
                  isAr
                    ? `نص مناسب لـ ${selectedPersona.nameAr}`
                    : `Script for ${selectedPersona.nameEn}`
                }
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  {isAr
                    ? `نموذج: ${selectedPersona.nameAr.split(' ')[0]}`
                    : `Sample: ${selectedPersona.nameEn.split(' ')[0]}`}
                </span>
              </button>
            )}

            {/* Load dialect sample */}
            <button
              id="btn-load-sample-script"
              onClick={handleLoadSample}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-amber-300 border border-slate-700/80 transition-colors flex items-center gap-1.5"
              title={isAr ? 'تحميل نص أصيل لهذه اللهجة' : 'Load authentic dialect sample'}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'نموذج لهذه اللهجة' : 'Load Dialect Sample'}</span>
            </button>

            {/* AI Tashkeel & Accentizer Button */}
            <button
              id="btn-ai-enhance-script"
              onClick={handleEnhanceScript}
              disabled={isEnhancing || !script.trim()}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1.5 border shadow-sm ${
                isEnhancing
                  ? 'bg-amber-500/30 text-amber-300 border-amber-500/50 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400'
              }`}
            >
              {isEnhancing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              <span>
                {isEnhancing
                  ? isAr
                    ? 'جاري ضبط التشكيل...'
                    : 'Enhancing...'
                  : isAr
                  ? 'تشكيل وتكييف اللهجة بالذكاء الاصطناعي'
                  : 'AI Tashkeel & Dialect Polish'}
              </span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            id="script-input-textarea"
            rows={5}
            value={script}
            onChange={(e) => onChangeScript(e.target.value)}
            placeholder={
              isAr
                ? 'اكتب أو الصق نص التعليق الصوتي هنا... يمكنك كتابة نص فصيح أو عامي وسيقوم المحرك الصوتي بتمثيله بدقة فائقة.'
                : 'Enter your Arabic voiceover text here...'
            }
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 rounded-2xl p-4 sm:p-5 text-white text-base sm:text-lg leading-relaxed placeholder:text-slate-600 outline-none resize-none font-['Cairo',sans-serif] transition-all"
            dir="rtl"
          />
        </div>

        {/* Dialect Director Notes (if enhanced) */}
        {enhanceNotes && (
          <div className="mt-3 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'تم تشكيل النص وتكييفه للهجة بنجاح' : 'Dialect & Tashkeel Applied'}</span>
            </div>
            {enhanceNotes.dialectNotes && (
              <p className="text-slate-300">
                <strong className="text-amber-200">{isAr ? 'الملاحظات الصوتية: ' : 'Notes: '}</strong>
                {enhanceNotes.dialectNotes}
              </p>
            )}
            {enhanceNotes.vocalDirectorAdvice && (
              <p className="text-slate-400 italic">
                <strong className="text-amber-200">{isAr ? 'توجيه المخرج: ' : 'Director: '}</strong>
                "{enhanceNotes.vocalDirectorAdvice}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Script Statistics Bar */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            {isAr ? 'الكلمات: ' : 'Words: '}
            <strong className="text-slate-200">{words}</strong>
          </span>
          <span>
            {isAr ? 'الحروف: ' : 'Chars: '}
            <strong className="text-slate-200">{chars}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-amber-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {isAr ? 'المدة التقديرية: ' : 'Est. Duration: '}
            <strong className="text-white font-bold">{estimatedSeconds}s</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
