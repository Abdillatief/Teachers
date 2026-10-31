import React, { useState } from 'react';
import { Sparkles, ArrowRight, Copy, Check, Wand2 } from 'lucide-react';

interface ScriptEnhancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  onApply: (enhancedText: string) => void;
}

export const ScriptEnhancerModal: React.FC<ScriptEnhancerModalProps> = ({
  isOpen,
  onClose,
  originalText,
  onApply,
}) => {
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState('حماسي ومؤثر للإعلانات التعليمية');
  const [targetAudience, setTargetAudience] = useState('الطلاب وأولياء الأمور');
  const [enhancedText, setEnhancedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEnhance = async () => {
    if (!originalText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enhance-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: originalText,
          tone,
          targetAudience,
        }),
      });

      const data = await response.json();
      if (data.enhancedText) {
        setEnhancedText(data.enhancedText);
      } else {
        setError('تعذر تحسين النص، يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!enhancedText) return;
    navigator.clipboard.writeText(enhancedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-sky-100 shadow-xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">تحسين النص للإعلان بالذكاء الاصطناعي</h3>
              <p className="text-xs text-slate-500">تحويل النص العادي إلى سكريبت إعلاني مصري جذاب ومؤثر</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all"
          >
            ✕
          </button>
        </div>

        {/* Input comparison options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">نبرة الإعلان المستهدفة</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500"
            >
              <option value="حماسي وجذاب للإعلانات التعليمية">حماسي وجذاب (عروض ودورات)</option>
              <option value="وقور وهادئ للدورات القرآنية والدينية">وقور وهادئ (محتوى قرآني وتربوي)</option>
              <option value="شبابي وعصري للريلز وتيك توك">شبابي وعصري (سوشيال ميديا)</option>
              <option value="حنون وأسري للأطفال">حنون وأسري (أطفال وعائلات)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">الجمهور المستهدف</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="مثال: أولياء الأمور، الطلاب..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Original Text display */}
        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">النص الأصلي:</span>
          <p className="text-xs text-slate-700 leading-relaxed max-h-24 overflow-y-auto">
            {originalText || 'لم يتم إدخال نص بعد'}
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleEnhance}
          disabled={loading || !originalText.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-sky-500 text-white font-medium text-sm flex items-center justify-center gap-2 hover:bg-sky-600 active:scale-[0.99] disabled:opacity-50 transition-all shadow-xs"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>جاري صياغة السكريبت الإعلاني بالذكاء الاصطناعي...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>تحسين وصياغة النص كإعلان مصري احترافي</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-3 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl">
            {error}
          </div>
        )}

        {/* Enhanced output */}
        {enhancedText && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                السكريبت الإعلاني المقترح:
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-600 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>

            <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto font-medium">
              {enhancedText}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onApply(enhancedText);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
              >
                <span>اعتماد واستخدام في مربع النص</span>
                <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
