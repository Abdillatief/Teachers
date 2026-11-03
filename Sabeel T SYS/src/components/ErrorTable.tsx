import React, { useState } from 'react';
import { Search, Filter, AlertCircle, Plus, Trash2, CheckCircle, Tag } from 'lucide-react';
import { CorrectionError, ErrorCategory } from '../types';

interface ErrorTableProps {
  errors: CorrectionError[];
  onAddError?: (error: CorrectionError) => void;
  onRemoveError?: (id: string) => void;
}

export const ErrorTable: React.FC<ErrorTableProps> = ({ errors, onAddError, onRemoveError }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New error form state
  const [newOrig, setNewOrig] = useState('');
  const [newCorr, setNewCorr] = useState('');
  const [newRule, setNewRule] = useState('همزة الوصل');
  const [newType, setNewType] = useState<ErrorCategory>('spelling');
  const [newExplanation, setNewExplanation] = useState('');

  const filteredErrors = errors.filter((err) => {
    const matchesFilter = filterType === 'all' || err.type === filterType;
    const matchesSearch =
      err.originalWord.toLowerCase().includes(searchQuery.toLowerCase()) ||
      err.correctedWord.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (err.ruleCategory && err.ruleCategory.toLowerCase().includes(searchQuery.toLowerCase())) ||
      err.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrig.trim() || !newCorr.trim() || !newExplanation.trim()) return;

    const typeNames: Record<ErrorCategory, string> = {
      spelling: 'إملائي',
      grammar: 'نحوي',
      punctuation: 'علامات ترقيم',
      structure: 'بنية الجملة',
      style: 'أسلوب لغوي',
      morphology: 'صرفي',
      other: 'لغوي عام',
    };

    if (onAddError) {
      onAddError({
        id: `err-${Date.now()}`,
        originalWord: newOrig.trim(),
        correctedWord: newCorr.trim(),
        ruleCategory: newRule.trim() || 'قواعد إملائية فصحى',
        type: newType,
        typeName: typeNames[newType],
        explanation: newExplanation.trim(),
      });
    }

    setNewOrig('');
    setNewCorr('');
    setNewExplanation('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white font-['Cairo']">
              جدول الأخطاء المرصودة والتعليلات النحوية والإملائية
            </h3>
            <span className="text-xs bg-rose-500/15 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
              {errors.length} موضع
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            كل كلمة في هذا الجدول وضِع تحتها خط في النص المصحح لمساعدة الطالب والمعلم
          </p>
        </div>

        {/* Action button */}
        {onAddError && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة خطأ يدوي</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'spelling', label: 'أخطاء إملائية' },
            { id: 'grammar', label: 'أخطاء نحوية' },
            { id: 'punctuation', label: 'علامات ترقيم' },
            { id: 'morphology', label: 'أخطاء صرفية' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap text-xs font-medium ${
                filterType === item.id
                  ? 'bg-amber-500 text-black font-bold shadow'
                  : 'bg-black text-neutral-400 hover:text-white border border-neutral-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأخطاء أو الشرح..."
            className="w-full bg-black border border-neutral-800 rounded-lg pr-9 pl-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Errors Table */}
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-right text-xs">
          <thead className="bg-black/90 text-neutral-400 font-semibold border-b border-neutral-800">
            <tr>
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4">الكلمة في الصورة (الخطأ)</th>
              <th className="py-3 px-4">التصويب المعتمد</th>
              <th className="py-3 px-4">نوع الخطأ</th>
              <th className="py-3 px-4">التعليل والقاعدة اللغوية</th>
              {onRemoveError && <th className="py-3 px-4 w-16 text-center">إجراء</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900 bg-neutral-950">
            {filteredErrors.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-neutral-500">
                  لا توجد أخطاء مطابقة لمعايير البحث.
                </td>
              </tr>
            ) : (
              filteredErrors.map((err, idx) => (
                <tr key={err.id} className="hover:bg-neutral-900/50 transition">
                  <td className="py-3 px-4 text-center font-mono text-neutral-500">{idx + 1}</td>
                  <td className="py-3 px-4 font-['Amiri'] text-base text-rose-400 font-bold">
                    <span className="bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 line-through">
                      {err.originalWord}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-['Amiri'] text-base text-emerald-400 font-bold">
                    <span className="bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {err.correctedWord}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          err.type === 'grammar'
                            ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            : err.type === 'spelling'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        }`}
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {err.typeName}
                      </span>
                      {err.ruleCategory && (
                        <span className="text-[10px] text-amber-300 font-bold bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
                          {err.ruleCategory}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-neutral-300 leading-relaxed font-['Cairo']">
                    {err.explanation}
                    {err.sentenceContext && (
                      <span className="block text-[11px] text-neutral-500 font-['Amiri'] mt-0.5">
                        السياق: "{err.sentenceContext}"
                      </span>
                    )}
                  </td>
                  {onRemoveError && (
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onRemoveError(err.id)}
                        title="حذف هذا الخطأ وإعادة احتساب الدرجة تلقائياً"
                        className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-neutral-900 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Manual Add Error Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h4 className="text-base font-bold text-white font-['Cairo']">إضافة خطأ وتصويب يدوياً</h4>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-white p-1 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNew} className="space-y-4 text-xs font-['Cairo']">
              <div>
                <label className="block text-neutral-400 mb-1">الكلمة كما ظهرت في الصورة (الخطأ):</label>
                <input
                  type="text"
                  required
                  value={newOrig}
                  onChange={(e) => setNewOrig(e.target.value)}
                  placeholder="مثال: هاذا"
                  className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">الكلمة المصححة (المعتمدة):</label>
                <input
                  type="text"
                  required
                  value={newCorr}
                  onChange={(e) => setNewCorr(e.target.value)}
                  placeholder="مثال: هذا"
                  className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">نوع الخطأ:</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ErrorCategory)}
                  className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="spelling">إملائي</option>
                  <option value="grammar">نحوي</option>
                  <option value="punctuation">علامات ترقيم</option>
                  <option value="morphology">صرفي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">التعليل والقاعدة الإملائية/النحوية:</label>
                <textarea
                  required
                  rows={3}
                  value={newExplanation}
                  onChange={(e) => setNewExplanation(e.target.value)}
                  placeholder="اكتب التعليل التعليمي للخطأ..."
                  className="w-full bg-black border border-neutral-800 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-neutral-400 hover:text-white cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer"
                >
                  حفظ وتحديث الدرجة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
