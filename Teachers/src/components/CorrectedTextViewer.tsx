import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  Eye,
  Sparkles,
  AlignJustify,
  ListOrdered,
  MousePointerClick,
  X,
  BookCheck,
  AlertCircle,
} from 'lucide-react';
import { CorrectionError } from '../types';
import { buildStudentTextWithUnderlines } from '../utils/arabicEvaluator';

interface CorrectedTextViewerProps {
  rawText: string;
  studentUnderlinedText?: string;
  correctedHtml: string;
  correctedPlain: string;
  actualWordCount: number;
  errors: CorrectionError[];
}

interface HoverTooltipState {
  visible: boolean;
  x: number;
  y: number;
  error: CorrectionError;
}

export const CorrectedTextViewer: React.FC<CorrectedTextViewerProps> = ({
  rawText,
  studentUnderlinedText,
  correctedHtml,
  correctedPlain,
  actualWordCount,
  errors,
}) => {
  // Default to student's text with underlined misspelled words & hover correction as requested
  const [viewMode, setViewMode] = useState<'student-underlined' | 'corrected' | 'raw'>('student-underlined');
  const [copiedType, setCopiedType] = useState<'plain' | 'html' | null>(null);
  const [selectedError, setSelectedError] = useState<CorrectionError | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltipState | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isNotebookLined, setIsNotebookLined] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close hover tooltip on outside scroll
  useEffect(() => {
    const handleScroll = () => {
      if (hoverTooltip) {
        setHoverTooltip(null);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [hoverTooltip]);

  // Copy plain text preserving line breaks
  const copyPlain = () => {
    navigator.clipboard.writeText(correctedPlain || rawText);
    setCopiedType('plain');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Copy HTML with <u> tags preserving line breaks
  const copyHtml = () => {
    navigator.clipboard.writeText(correctedHtml);
    setCopiedType('html');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Arabic TTS using browser SpeechSynthesis
  const toggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('متصفحك لا يدعم القراءة الصوتية للنصوص.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = viewMode === 'raw' ? rawText : correctedPlain;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Find error metadata from an element or word
  const findMatchingError = (target: HTMLElement): CorrectionError | null => {
    const errId = target.getAttribute('data-err-id');
    if (errId) {
      const match = errors.find((e) => e.id === errId);
      if (match) return match;
    }

    const origWordAttr = target.getAttribute('data-original');
    const corrWordAttr = target.getAttribute('data-corrected');
    const ruleAttr = target.getAttribute('data-rule');
    const expAttr = target.getAttribute('data-explanation');

    if (origWordAttr || corrWordAttr) {
      return {
        id: errId || 'err-data',
        originalWord: origWordAttr || target.innerText.trim(),
        correctedWord: corrWordAttr || '',
        ruleCategory: ruleAttr || 'قواعد إملائية فصحى',
        type: 'spelling',
        typeName: 'إملائي',
        explanation: expAttr || 'التصحيح وفق قواعد الإملاء العربي الفصيح.',
      };
    }

    const wordText = target.innerText.trim();
    const directMatch = errors.find(
      (e) =>
        e.originalWord.trim() === wordText ||
        e.correctedWord.trim() === wordText ||
        wordText.includes(e.originalWord.trim()) ||
        wordText.includes(e.correctedWord.trim())
    );
    if (directMatch) return directMatch;

    return null;
  };

  // Hover handlers for mouse tooltip
  const handleMouseOver = (e: React.MouseEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest('.student-error-word, u') as HTMLElement | null;
    if (!target) return;

    const matched = findMatchingError(target);
    if (!matched) return;

    const rect = target.getBoundingClientRect();
    setHoverTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top,
      error: matched,
    });
  };

  const handleMouseOut = (e: React.MouseEvent<HTMLElement>) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !related.closest('.student-error-word, u')) {
      setHoverTooltip(null);
    }
  };

  const handleWordClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = (e.target as HTMLElement).closest('.student-error-word, u') as HTMLElement | null;
    if (target) {
      const match = findMatchingError(target);
      if (match) {
        setSelectedError(match);
      }
    }
  };

  // Build the text keeping the original misspelled words, styled with an underline in RED
  const getRenderableContent = () => {
    if (viewMode === 'student-underlined') {
      const baseText = rawText || correctedPlain || '';
      return buildStudentTextWithUnderlines(baseText, errors);
    }

    if (viewMode === 'corrected') {
      let html = correctedHtml;
      if (!html.includes('<u>') && correctedPlain) {
        html = correctedPlain;
        errors.forEach((err) => {
          if (err.correctedWord) {
            const esc = err.correctedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const reg = new RegExp(`(?<=^|[^\\p{L}\\p{M}\\p{N}])(${esc})(?=$|[^\\p{L}\\p{M}\\p{N}])`, 'gu');
            html = html.replace(reg, `<u>$1</u>`);
          }
        });
      }
      return html.replace(
        /<u>(.*?)<\/u>/g,
        '<u class="corrected-word" style="text-decoration: underline !important; text-decoration-color: #ef4444 !important; -webkit-text-decoration-color: #ef4444 !important; border-bottom: 3px solid #ef4444 !important; color: #f87171 !important; background-color: rgba(239, 68, 68, 0.16) !important; padding: 2px 5px !important; margin: 0 1px !important; border-radius: 4px !important; font-weight: bold !important; cursor: pointer !important; display: inline !important;" title="انقر لعرض تفاصيل الخطأ والتصويب">$1</u>'
      );
    }

    // raw text
    return rawText;
  };

  const contentHtml = getRenderableContent();

  return (
    <div
      ref={containerRef}
      className="bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
    >
      {/* Top Banner Header */}
      <div className="bg-neutral-900/90 px-4 sm:px-6 py-3.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: View Mode Pills */}
        <div className="flex items-center gap-1.5 bg-black/60 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setViewMode('student-underlined')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'student-underlined'
                ? 'bg-rose-500 text-white shadow-md font-extrabold ring-1 ring-rose-400/50'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            <span>نص الطالب (أخطاء معلمة بالأحمر + تصحيح بالماوس)</span>
          </button>

          <button
            onClick={() => setViewMode('corrected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'corrected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>النص المصوب بالكامل</span>
          </button>

          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'raw'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>التفريغ الحرفي فقط</span>
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {/* Lined Notebook Toggle */}
          <button
            onClick={() => setIsNotebookLined(!isNotebookLined)}
            title="تفعيل/إلغاء تسطير أسطر الدفتر كصورة الورقة"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
              isNotebookLined
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-black border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <AlignJustify className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">أسطر الورقة</span>
          </button>

          {/* Line Numbers Toggle */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="ترقيم أسطر الورقة"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer ${
              showLineNumbers
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-black border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">أرقام الأسطر</span>
          </button>

          {/* Word Count Indicator */}
          <div className="bg-black border border-neutral-800 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 text-neutral-300">
            <span>الكلمات:</span>
            <strong className="text-amber-400 font-bold">{actualWordCount}</strong>
          </div>

          {/* Copy Button */}
          <button
            onClick={copyPlain}
            title="نسخ النص كاملاً مع الحفاظ على الأسطر والفقرات"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black border border-neutral-800 text-neutral-300 hover:text-white transition cursor-pointer"
          >
            {copiedType === 'plain' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">نسخ</span>
          </button>

          {/* Copy HTML */}
          <button
            onClick={copyHtml}
            title="نسخ النص كود HTML مع وسوم الأخطاء"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black border border-neutral-800 text-amber-300 hover:text-amber-200 transition cursor-pointer"
          >
            {copiedType === 'html' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <span className="font-mono text-[11px]">&lt;u&gt;</span>}
          </button>

          {/* TTS Listen */}
          <button
            onClick={toggleSpeech}
            title={isSpeaking ? 'إيقاف القراءة الصوتية' : 'استماع باللغة العربية الفصحى'}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isSpeaking
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-black border-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Helpful Hint Bar */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-200 font-['Cairo']">
        <div className="flex items-center gap-2">
          <BookCheck className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            {viewMode === 'student-underlined' ? (
              <>
                <strong>طريقة العرض:</strong> النص بنفس ترتيب الورقة، والكلمات الخاطئة{' '}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/25 text-rose-400 font-bold border border-rose-500/50 underline decoration-rose-500 decoration-wavy">
                  معلمة باللون الأحمر
                </span>
                . ضع الماوس على أي كلمة حمراء لرؤية التصويب الفصيح والقاعدة الإملائية فوراً.
              </>
            ) : viewMode === 'corrected' ? (
              <>
                <strong>النسخة المصوبة:</strong> تم تصحيح كل الكلمات لتطابق الفصحى وقواعد الرسم والإملاء.
              </>
            ) : (
              <>
                <strong>التفريغ الحرفي:</strong> النص كما كتبه الطالب بالصورة دون أي تعديل.
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{errors.length} خطأ معلم بالأحمر</span>
          </span>
        </div>
      </div>

      {/* Text Canvas Container */}
      <div
        className="p-6 sm:p-10 overflow-y-auto min-h-[440px] max-h-[700px] bg-black select-text"
      >
        <div
          className={`p-6 sm:p-10 rounded-2xl border border-neutral-800/80 shadow-inner relative transition-all ${
            isNotebookLined
              ? 'bg-neutral-950 [background-image:linear-gradient(to_bottom,transparent_39px,#1f1f1f_40px)] [background-size:100%_40px]'
              : 'bg-neutral-950'
          }`}
        >
          {showLineNumbers ? (
            <div className="space-y-1">
              {contentHtml.split('\n').map((line, idx) => (
                <div key={idx} className="flex items-baseline gap-4 group">
                  <span className="text-xs font-mono text-neutral-600 select-none w-7 text-left group-hover:text-amber-400 shrink-0">
                    {idx + 1}
                  </span>
                  <div
                    className="flex-1 font-['Amiri'] text-xl sm:text-2xl leading-[2.6] text-neutral-100 tracking-wide break-words"
                    dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                    onMouseOver={handleMouseOver}
                    onMouseOut={handleMouseOut}
                    onClick={handleWordClick}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="font-['Amiri'] text-xl sm:text-2xl leading-[2.6] text-neutral-100 tracking-wide whitespace-pre-wrap break-words selection:bg-rose-500/30 selection:text-white"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              onClick={handleWordClick}
            />
          )}
        </div>
      </div>

      {/* Floating Hover Tooltip: "واذا وضعت الموس عليها يظهر الصحيح" */}
      {hoverTooltip && hoverTooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverTooltip.x}px`,
            top: `${hoverTooltip.y - 14}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 99999,
          }}
          className="animate-fadeIn transition-all duration-150"
        >
          <div className="bg-neutral-950/95 backdrop-blur-md border-2 border-amber-500/80 text-white rounded-2xl shadow-2xl p-4 max-w-xs sm:max-w-sm text-right font-['Cairo'] relative shadow-black/90 ring-1 ring-amber-500/20">
            {/* Arrow Pointer */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-neutral-950 border-r-2 border-b-2 border-amber-500/80 rotate-45"></div>

            <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2 mb-2.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/50">
                خطأ: {hoverTooltip.error.typeName || 'إملائي'}
              </span>
              <span className="text-xs font-bold text-amber-400">
                القاعدة: {hoverTooltip.error.ruleCategory || 'قواعد الإملاء الفصيح'}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 bg-black/60 p-2 rounded-xl border border-neutral-800/80">
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">كتب الطالب (خطأ):</span>
                  <span className="line-through text-rose-400 font-bold font-['Amiri'] text-lg">
                    {hoverTooltip.error.originalWord}
                  </span>
                </div>
                <span className="text-neutral-500 font-bold text-lg">←</span>
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 block font-semibold">الصواب بالفصحى:</span>
                  <span className="text-emerald-400 font-black font-['Amiri'] text-xl">
                    {hoverTooltip.error.correctedWord}
                  </span>
                </div>
              </div>

              {hoverTooltip.error.explanation && (
                <div className="text-xs text-neutral-200 leading-relaxed font-['Cairo'] pt-1">
                  <strong className="text-amber-400">التعليل والقاعدة: </strong>
                  {hoverTooltip.error.explanation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Error Drawer / Click Pin for Mobile & Inspection */}
      {selectedError && (
        <div className="bg-neutral-900 border-t-2 border-rose-500/50 p-4 sm:p-5 animate-slideUp">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold bg-rose-500/25 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-md">
                  {selectedError.typeName}
                </span>
                <span className="text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-md">
                  القاعدة: {selectedError.ruleCategory || 'إملاء اللغة العربية الفصحى'}
                </span>
                <div className="flex items-center gap-2 text-sm mr-2">
                  <span className="text-neutral-400 text-xs">كتب الطالب:</span>
                  <span className="text-rose-400 font-bold font-['Amiri'] text-lg line-through px-2 py-0.5 rounded bg-rose-950/60 border border-rose-700/50">
                    {selectedError.originalWord}
                  </span>
                  <span className="text-neutral-400 text-xs">← الصواب بالفصحى:</span>
                  <span className="text-emerald-400 font-bold font-['Amiri'] text-lg px-2.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/50">
                    {selectedError.correctedWord}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-['Cairo']">
                <strong className="text-amber-400">التعليل النحوي/الإملائي: </strong>
                {selectedError.explanation}
              </p>

              {selectedError.sentenceContext && (
                <p className="text-xs text-neutral-400 font-['Amiri'] italic">
                  السياق في الجملة: "{selectedError.sentenceContext}"
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedError(null)}
              className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 text-xs cursor-pointer flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">إغلاق</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom CSS for Underlines and Interactive Words - VIBRANT RED MARKING */}
      <style>{`
        u.student-error-word,
        .student-error-word,
        mark.student-error-word {
          background-color: rgba(239, 68, 68, 0.18) !important;
          color: #f87171 !important;
          text-decoration: underline !important;
          text-decoration-color: #ef4444 !important;
          -webkit-text-decoration-color: #ef4444 !important;
          text-decoration-style: solid !important;
          text-decoration-thickness: 3px !important;
          text-underline-offset: 6px !important;
          border-bottom: 3px solid #ef4444 !important;
          font-weight: 700 !important;
          padding: 1px 5px !important;
          margin: 0 1px !important;
          border-radius: 4px !important;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.3) !important;
          cursor: pointer !important;
          display: inline !important;
          transition: all 0.2s ease !important;
        }
        u.student-error-word:hover,
        .student-error-word:hover,
        mark.student-error-word:hover {
          background-color: rgba(239, 68, 68, 0.45) !important;
          color: #ffffff !important;
          border-bottom: 3px solid #fecaca !important;
          text-decoration-color: #fecaca !important;
          box-shadow: 0 0 16px rgba(239, 68, 68, 0.6) !important;
        }
        u.corrected-word {
          cursor: pointer;
          border-bottom: 3px solid #ef4444 !important;
          text-decoration: underline !important;
          text-decoration-color: #ef4444 !important;
          color: #f87171 !important;
          background-color: rgba(239, 68, 68, 0.18) !important;
          display: inline !important;
        }
        u.corrected-word:hover {
          background-color: rgba(239, 68, 68, 0.35) !important;
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
};
