import React from 'react';
import {
  Award,
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Scale,
  ShieldCheck,
  Mail,
  CheckCircle2,
  XCircle,
  Info,
  Layers,
  Sparkles,
  FileText,
  BadgeAlert,
  ChevronDown,
} from 'lucide-react';
import { GradingResult, LetterTemplateCheck } from '../types';

interface RubricScoreCardProps {
  result: GradingResult;
  onUpdateContentScore?: (newScore: number) => void;
  onUpdateLetterTemplate?: (updatedTemplate: LetterTemplateCheck) => void;
}

export const RubricScoreCard: React.FC<RubricScoreCardProps> = ({
  result,
  onUpdateContentScore,
  onUpdateLetterTemplate,
}) => {
  const {
    contentScore,
    contentFeedback,
    errorCount,
    totalRawErrors = result.errors?.length || 0,
    calculatedMistakes = errorCount || 0,
    ruleGroups = [],
    baseLanguageScore = 10,
    templateDeduction = 0,
    languageScore,
    languageScoreReason,
    letterTemplate,
    actualWordCount,
    targetWordCount = 150,
    lengthStatus,
    lengthFeedback,
    totalScore,
    ratingLabel,
    doubleCheckVerified,
    transcriptionNotes,
  } = result;

  // Toggle letter template element
  const handleToggleElement = (elementKey: 'hasSenderReceiverBox' | 'hasIntroduction' | 'hasConclusion') => {
    if (!onUpdateLetterTemplate || !letterTemplate) return;
    const updated = {
      ...letterTemplate,
      [elementKey]: !letterTemplate[elementKey],
    };
    onUpdateLetterTemplate(updated);
  };

  const handleToggleIsLetter = () => {
    if (!onUpdateLetterTemplate || !letterTemplate) return;
    const updated = {
      ...letterTemplate,
      isLetter: !letterTemplate.isLetter,
    };
    onUpdateLetterTemplate(updated);
  };

  const repeatedRulesSavings = Math.max(0, totalRawErrors - calculatedMistakes);

  // Brackets data for visual gauge
  const brackets = [
    {
      label: 'بحد أقصى 5 أخطاء',
      range: '0 - 5',
      baseScore: 10,
      active: calculatedMistakes <= 5,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
    },
    {
      label: 'من 6 إلى 9 أخطاء',
      range: '6 - 9',
      baseScore: 8,
      active: calculatedMistakes > 5 && calculatedMistakes <= 9,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/40',
    },
    {
      label: 'من 10 إلى 19 خطأً',
      range: '10 - 19',
      baseScore: 6,
      active: calculatedMistakes >= 10 && calculatedMistakes <= 19,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/40',
    },
    {
      label: '20 خطأً أو أكثر',
      range: '20+',
      baseScore: 4,
      active: calculatedMistakes >= 20,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/40',
    },
  ];

  return (
    <section className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Cairo'] flex items-center gap-2">
              <span>النتيجة النهائية والتقييم المعتمد</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                لغة عربية فصحى
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              ملخص الدرجات، عدد الكلمات بدقة، وتفصيل القواعد الإملائية مع احتساب تكرار القاعدة خطأ واحداً
            </p>
          </div>
        </div>

        {/* Word count & rating badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300">
            عدد الكلمات الدقيق: <strong className="text-blue-400 font-bold">{actualWordCount} كلمة</strong>
          </span>
          <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-500 text-black font-extrabold shadow">
            {ratingLabel}
          </span>
        </div>
      </div>

      {/* Top Banner: Big Total Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-black border border-neutral-800">
        {/* Main Overall Grade */}
        <div className="md:col-span-1 flex flex-col justify-center items-center md:items-start p-4 bg-black/60 rounded-xl border border-neutral-800/80 text-center md:text-right">
          <span className="text-xs text-neutral-400 font-semibold mb-1">الدرجة الكلية المستحقة</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-tight">
              {totalScore}
            </span>
            <span className="text-lg font-bold text-neutral-500 font-mono">/ 20</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-2">
            المحتوى ({contentScore}) + اللغة ({languageScore})
          </span>
        </div>

        {/* Component 1: Content Score */}
        <div className="p-4 bg-black/40 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>أولاً: المحتوى والأفكار</span>
              <span className="font-mono text-amber-400 font-bold">{contentScore} / 10</span>
            </div>
            <p className="text-xs text-neutral-300 line-clamp-2">
              {contentFeedback}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center gap-1.5 text-[11px] text-neutral-400">
            <span>تعديل سريع:</span>
            {[4, 6, 8, 10].map((score) => (
              <button
                key={score}
                onClick={() => onUpdateContentScore && onUpdateContentScore(score)}
                className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer transition ${
                  contentScore === score
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                {score}
              </button>
            ))}
          </div>
        </div>

        {/* Component 2: Language Score */}
        <div className="p-4 bg-black/40 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>ثانياً: سلامة اللغة</span>
              <span className="font-mono text-emerald-400 font-bold">{languageScore} / 10</span>
            </div>
            <div className="text-xs text-neutral-300 space-y-1">
              <div>
                سلم الأخطاء: <strong className="text-white font-mono">{baseLanguageScore} درجات</strong>
              </div>
              {templateDeduction > 0 && (
                <div className="text-rose-400 text-[11px]">
                  خصم تيمبلت الرسالة: (-{templateDeduction} درجة)
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-800 text-[11px] text-neutral-400 font-mono">
            {calculatedMistakes} أخطاء محتسبة
          </div>
        </div>

        {/* Component 3: Accurate Word Count */}
        <div className="p-4 bg-black/40 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
              <span>ثالثاً: طول النص وعدد الكلمات</span>
              <span className="font-mono text-blue-400 font-bold">{actualWordCount} كلمة</span>
            </div>
            <p className="text-xs text-neutral-300">
              {lengthFeedback}
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-neutral-800 text-[11px] text-neutral-400">
            الهدف: في حدود ~{targetWordCount} كلمة
          </div>
        </div>
      </div>

      {/* Accurate Errors Accounting Card (Count Every Mistake) */}
      <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white font-['Cairo'] flex items-center gap-2">
                <span>حصر وتدقيق جميع الأخطاء الإملائية والنحوية</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-bold">
                  احتساب شامل لكافة الأخطاء
                </span>
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed mt-1">
                يتم احتساب كل موضع خطأ إملائي أو نحوي أو صرفي مرصود في النص مباشرة دون استثناء، وتطبيق سلم الدرجات وفق إجمالي عدد الأخطاء.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-center px-4 py-2 rounded-xl bg-black/60 border border-neutral-700">
              <span className="text-[10px] text-neutral-400 block font-medium">إجمالي الأخطاء بالورقة</span>
              <span className="text-lg font-black text-rose-400 font-mono">{totalRawErrors}</span>
            </div>
            <span className="text-neutral-500 font-bold">=</span>
            <div className="text-center px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
              <span className="text-[10px] text-rose-300 block font-medium">الأخطاء المحتسبة بالدرجة</span>
              <span className="text-lg font-black text-rose-300 font-mono">{calculatedMistakes}</span>
            </div>
          </div>
        </div>

        {/* Rule Groups Breakdown Badges */}
        {ruleGroups && ruleGroups.length > 0 && (
          <div className="pt-2 border-t border-neutral-800">
            <span className="text-xs text-neutral-300 block mb-2 font-semibold">
              توزيع الأخطاء على القواعد الإملائية والنحوية المرصودة:
            </span>
            <div className="flex flex-wrap gap-2">
              {ruleGroups.map((rg, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/70 border border-neutral-800 text-xs text-neutral-200"
                >
                  <span className="font-bold text-neutral-200">{rg.ruleName}:</span>
                  <span className="text-neutral-400">
                    {rg.count} {rg.count === 1 ? 'خطأ' : 'أخطاء'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
                    = {rg.count} {rg.count === 1 ? 'خطأ محتسب' : 'أخطاء محتسبة'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Language Brackets Visual Ladder */}
      <div className="p-5 rounded-2xl bg-black border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white font-['Cairo']">
              سلم درجات اللغة المعتمد بناءً على الأخطاء المحتسبة ({calculatedMistakes} أخطاء)
            </h4>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            الدرجة الأساسية: <strong className="text-emerald-400">{baseLanguageScore} / 10</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {brackets.map((b, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-center transition-all ${
                b.active
                  ? `${b.color} ring-2 ring-emerald-500/30 font-bold scale-[1.02] shadow-lg`
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-500 opacity-60'
              }`}
            >
              <div className="text-[11px] mb-1 font-semibold">{b.label}</div>
              <div className="text-lg font-black font-mono">{b.baseScore} درجات</div>
              {b.active && (
                <span className="text-[10px] mt-1 inline-block bg-black/60 px-2 py-0.5 rounded text-white font-mono">
                  الفئة الحالية المستحقة ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Letter Template Verification (if applicable) */}
      {letterTemplate && (
        <div className="p-5 rounded-2xl bg-black border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white font-['Cairo']">
                فحص قالب وتيمبلت الرسالة (شرط خصم -1 عند نقص أي عنصر)
              </h4>
            </div>
            <button
              onClick={handleToggleIsLetter}
              className={`text-xs px-2.5 py-1 rounded-md border font-semibold cursor-pointer transition ${
                letterTemplate.isLetter
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800'
              }`}
            >
              {letterTemplate.isLetter ? 'نوع النص: رسالة (مفعل)' : 'نوع النص: مقال عام'}
            </button>
          </div>

          {letterTemplate.isLetter && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={() => handleToggleElement('hasSenderReceiverBox')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                  letterTemplate.hasSenderReceiverBox
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <span className="text-xs font-semibold">مربع وبيانات المرسل والمستلم</span>
                {letterTemplate.hasSenderReceiverBox ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </button>

              <button
                onClick={() => handleToggleElement('hasIntroduction')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                  letterTemplate.hasIntroduction
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <span className="text-xs font-semibold">المقدمة والتحية الافتتاحية</span>
                {letterTemplate.hasIntroduction ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </button>

              <button
                onClick={() => handleToggleElement('hasConclusion')}
                className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-center justify-between ${
                  letterTemplate.hasConclusion
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <span className="text-xs font-semibold">الخاتمة والعبارة الختامية</span>
                {letterTemplate.hasConclusion ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </button>
            </div>
          )}

          <p className="text-xs text-neutral-400 pt-1">
            {letterTemplate.templateNotes ||
              (letterTemplate.isLetter
                ? templateDeduction > 0
                  ? 'تم خصم (-1) درجة لعدم استيفاء عناصر الرسالة المطلوبة أعلاه.'
                  : 'قالب الرسالة مكتمل تماماً ومستوفٍ لكافة الشروط دون خصم.'
                : 'النص مصنف كمقال تعبير، لا ينطبق عليه شرط عناصر الرسالة.')}
          </p>
        </div>
      )}
    </section>
  );
};
