import React, { useRef } from 'react';
import { Printer, Download, X, Award, CheckCircle2, FileText } from 'lucide-react';
import { GradingResult } from '../types';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GradingResult;
  essayTopic?: string;
  studentName?: string;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  result,
  essayTopic = 'مقال لغة عربية',
  studentName = 'طالب الأكاديمية',
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="bg-white text-neutral-900 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col font-['Cairo']">
        {/* Top Modal Controls (No print) */}
        <div className="no-print bg-neutral-950 text-white px-6 py-4 flex items-center justify-between border-b border-neutral-800 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base">تقرير التقييم البصري المعتمد للطباعة</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند (Print/PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 text-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 space-y-8 bg-white text-neutral-900">
          {/* Official Letterhead */}
          <div className="flex items-center justify-between border-b-2 border-neutral-900 pb-6">
            <div>
              <div className="text-xl font-black text-amber-700 font-['Cairo']">أكاديمية سبيل للغة العربية</div>
              <div className="text-sm font-semibold text-neutral-600 mt-0.5">
                نظام التفريغ البصري والتقييم الآلي المعتمد
              </div>
            </div>
            <div className="text-left text-xs text-neutral-500 font-mono space-y-1">
              <div>تاريخ التقرير: {new Date(result.analyzedAt).toLocaleDateString('ar-EG')}</div>
              <div>رقم الوثيقة: SBL-{Date.now().toString().slice(-6)}</div>
              <div className="text-emerald-700 font-bold">التفريغ: 100% مكتمل ومطابق</div>
            </div>
          </div>

          {/* Student & Essay Metadata Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
            <div>
              <span className="text-neutral-500 block font-semibold">اسم الطالب:</span>
              <strong className="text-sm text-neutral-800">{studentName}</strong>
            </div>
            <div>
              <span className="text-neutral-500 block font-semibold">موضوع التعبير:</span>
              <strong className="text-sm text-neutral-800">{essayTopic}</strong>
            </div>
            <div>
              <span className="text-neutral-500 block font-semibold">عدد الكلمات الفعلي:</span>
              <strong className="text-sm text-neutral-800 font-mono">{result.actualWordCount} كلمة (الهدف: ~150)</strong>
            </div>
            <div>
              <span className="text-neutral-500 block font-semibold">التقدير العام:</span>
              <strong className="text-sm text-amber-700">{result.ratingLabel}</strong>
            </div>
          </div>

          {/* Score Summary Banner */}
          <div className="flex items-center justify-between p-5 rounded-xl bg-amber-50 border border-amber-200">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-900">الدرجة الإجمالية للمقال:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-amber-800 font-mono">{result.totalScore}</span>
                <span className="text-sm font-bold text-neutral-600 font-mono">/ 20 درجة</span>
              </div>
            </div>
            <div className="flex gap-4 text-center">
              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-xs text-neutral-500 block">المحتوى والأفكار</span>
                <span className="text-xl font-black text-neutral-800 font-mono">{result.contentScore} / 10</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-xs text-neutral-500 block">سلامة اللغة والقواعد</span>
                <span className="text-xl font-black text-emerald-700 font-mono">
                  {result.languageScore} / 10
                  {result.templateDeduction > 0 && (
                    <span className="text-xs text-rose-700 font-normal mr-1">(-1 تيمبلت)</span>
                  )}
                </span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-amber-200">
                <span className="text-xs text-neutral-500 block">الأخطاء المحتسبة</span>
                <span className="text-xl font-black text-rose-700 font-mono">
                  {result.calculatedMistakes ?? result.errorCount ?? result.errors.length}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  ({result.errors?.length || 0} موضع خطأ محتسب بالكامل)
                </span>
              </div>
            </div>
          </div>

          {/* Letter Template Verification Box if it's a letter */}
          {result.letterTemplate?.isLetter && (
            <div className="p-4 rounded-xl border border-neutral-300 bg-neutral-50 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                <span className="font-bold text-neutral-800">
                  فحص عناصر قالب الرسالة (المقدمة، الخاتمة، مربع المرسل والمستلم):
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    result.templateDeduction > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {result.templateDeduction > 0 ? 'خصم درجة واحدة (-1)' : 'مكتمل ومستوفٍ (بدون خصم)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className={`p-2 rounded border ${result.letterTemplate.hasSenderReceiverBox ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {result.letterTemplate.hasSenderReceiverBox ? '✓' : '✗'} مربع المرسل والمستلم
                </div>
                <div className={`p-2 rounded border ${result.letterTemplate.hasIntroduction ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {result.letterTemplate.hasIntroduction ? '✓' : '✗'} المقدمة (التحية الافتتاحية)
                </div>
                <div className={`p-2 rounded border ${result.letterTemplate.hasConclusion ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {result.letterTemplate.hasConclusion ? '✓' : '✗'} الخاتمة (العبارة الختامية)
                </div>
              </div>
              {result.templateDeduction > 0 && (
                <p className="text-rose-700 pt-1">
                  * تم تطبيق قاعدة تيمبلت الرسالة: خصم درجة من اللغة لعدم كتابة: {result.letterTemplate.missingElements.join('، ')}.
                </p>
              )}
            </div>
          )}

          {/* Essay Body with Underlines */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-neutral-800 border-b pb-1">
              نص المقال/الرسالة المفرغ بدقة 100% مع تحديد الأخطاء المصححة بوسم (&lt;u&gt;):
            </h4>
            <div
              className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 font-['Amiri'] text-xl leading-[2.4] text-neutral-900 whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: result.correctedHtmlText }}
            />
          </div>

          {/* Content & Language Detailed Feedback */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-1">
              <h5 className="font-bold text-neutral-800">تقرير المحتوى والأفكار (من 10):</h5>
              <p className="text-neutral-700 leading-relaxed">{result.contentFeedback}</p>
            </div>
            <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-1">
              <h5 className="font-bold text-neutral-800">تقرير اللغة والقواعد (من 10):</h5>
              <p className="text-neutral-700 leading-relaxed">{result.languageScoreReason}</p>
              <p className="text-[11px] text-neutral-500 mt-1">{result.lengthFeedback}</p>
            </div>
          </div>

          {/* Mistakes Table */}
          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-neutral-800 border-b pb-1">
                سجل الأخطاء والتصويبات المعتمدة ({result.errors.length}):
              </h4>
              <table className="w-full text-right text-xs border border-neutral-200">
                <thead className="bg-neutral-100 text-neutral-700 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="p-2 text-center w-8">#</th>
                    <th className="p-2">الكلمة في الصورة</th>
                    <th className="p-2">التصويب</th>
                    <th className="p-2">النوع</th>
                    <th className="p-2">التعليل والقاعدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {result.errors.map((err, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      <td className="p-2 text-center text-neutral-400 font-mono">{i + 1}</td>
                      <td className="p-2 font-['Amiri'] text-rose-700 font-bold">{err.originalWord}</td>
                      <td className="p-2 font-['Amiri'] text-emerald-700 font-bold">{err.correctedWord}</td>
                      <td className="p-2 text-neutral-600">{err.typeName}</td>
                      <td className="p-2 text-neutral-700">{err.explanation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures Footer */}
          <div className="pt-8 border-t border-neutral-300 flex items-center justify-between text-xs text-neutral-600">
            <div>
              <span>توقيع المعلم الفاحص: ______________________</span>
            </div>
            <div>
              <span>ختم الأكاديمية: ______________________</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
