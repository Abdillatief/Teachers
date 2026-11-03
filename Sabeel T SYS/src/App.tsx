import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Printer,
  RotateCcw,
  BookOpen,
  Layout,
  Table as TableIcon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowDownCircle,
} from 'lucide-react';
import { GradingResult, CorrectionError, LetterTemplateCheck } from './types';
import { ImageUploader } from './components/ImageUploader';
import { CorrectedTextViewer } from './components/CorrectedTextViewer';
import { RubricScoreCard } from './components/RubricScoreCard';
import { ImageViewer } from './components/ImageViewer';
import { ErrorTable } from './components/ErrorTable';
import { PrintReportModal } from './components/PrintReportModal';
import { transcribeAndGradeEssay } from './services/geminiService';
import {
  calculateLanguageScoreWithRules,
  groupAndDeduplicateErrors,
  buildStudentTextWithUnderlines,
  countArabicWords,
} from './utils/arabicEvaluator';
import { SAMPLE_ESSAYS, SampleEssayData } from './data/sampleEssays';

export default function App() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentMimeType, setCurrentMimeType] = useState<string>('image/jpeg');
  const [essayTopic, setEssayTopic] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Default to first sample essay for instant rich preview
  const defaultSample = SAMPLE_ESSAYS[0];
  const [result, setResult] = useState<GradingResult | null>(defaultSample.sampleResult);
  const [viewMode, setViewMode] = useState<'correction' | 'sideBySide' | 'table'>('correction');
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Recalculates full scoring whenever errors or letter template components change
  const recalculateAll = (
    currentErrors: CorrectionError[],
    currentTemplate?: LetterTemplateCheck,
    contentScoreOverride?: number
  ) => {
    if (!result) return;

    const { totalRawErrors, calculatedMistakes, ruleGroups } = groupAndDeduplicateErrors(currentErrors);

    const letterCheck = currentTemplate
      ? {
          isLetter: currentTemplate.isLetter,
          hasSenderReceiverBox: currentTemplate.hasSenderReceiverBox,
          hasIntroduction: currentTemplate.hasIntroduction,
          hasConclusion: currentTemplate.hasConclusion,
        }
      : undefined;

    const langEval = calculateLanguageScoreWithRules(
      calculatedMistakes,
      totalRawErrors,
      ruleGroups,
      letterCheck
    );

    const contentScore = contentScoreOverride ?? result.contentScore;
    const totalScore = Number((contentScore + langEval.finalScore).toFixed(1));

    let ratingLabel = 'جيد';
    if (totalScore >= 18) ratingLabel = 'ممتاز 🌟';
    else if (totalScore >= 15) ratingLabel = 'جيد جداً ⭐';
    else if (totalScore >= 12) ratingLabel = 'جيد 👍';
    else if (totalScore >= 10) ratingLabel = 'مقبول';
    else ratingLabel = 'يحتاج إلى تحسين ومتابعة ⚠️';

    const studentTextWithUnderlinedErrors = buildStudentTextWithUnderlines(
      result.rawTranscribedText,
      currentErrors
    );

    setResult({
      ...result,
      errors: currentErrors,
      totalRawErrors,
      calculatedMistakes,
      ruleGroups,
      languageScore: langEval.finalScore,
      languageScoreBreakdown: {
        baseScore: langEval.baseScore,
        deduction: langEval.deduction,
        reason: langEval.reason,
      },
      contentScore,
      totalScore,
      ratingLabel,
      letterTemplate: currentTemplate,
      studentTextWithUnderlinedErrors,
    });
  };

  const handleImageSelected = async (
    base64: string,
    mimeType: string,
    sampleData?: SampleEssayData
  ) => {
    setCurrentImage(base64);
    setCurrentMimeType(mimeType);
    setErrorMsg(null);

    // If a sample essay was selected from pre-computed cards
    if (sampleData && sampleData.sampleResult) {
      setResult(sampleData.sampleResult);
      if (sampleData.topic) setEssayTopic(sampleData.topic);
      return;
    }

    // Process actual uploaded image or camera snapshot via Gemini API
    setIsLoading(true);
    try {
      const grading = await transcribeAndGradeEssay({
        imageBase64: base64,
        mimeType: mimeType || 'image/jpeg',
        essayTopic: essayTopic || undefined,
      });
      setResult(grading);
    } catch (err: any) {
      console.error('Error grading essay:', err);
      setErrorMsg(err.message || 'تعذر تحليل وتصحيح الصورة، يرجى التأكد من وضوح الخط وإعادة المحاولة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCurrentImage(null);
    setResult(null);
    setErrorMsg(null);
    setEssayTopic('');
  };

  const handleUpdateContentScore = (newScore: number) => {
    if (!result) return;
    recalculateAll(result.errors, result.letterTemplate, newScore);
  };

  const handleUpdateLetterTemplate = (newTemplate: LetterTemplateCheck) => {
    if (!result) return;
    recalculateAll(result.errors, newTemplate, result.contentScore);
  };

  const handleAddError = (newError: CorrectionError) => {
    if (!result) return;
    const updatedErrors = [...result.errors, newError];
    recalculateAll(updatedErrors, result.letterTemplate, result.contentScore);
  };

  const handleRemoveError = (id: string) => {
    if (!result) return;
    const updatedErrors = result.errors.filter((e) => e.id !== id);
    recalculateAll(updatedErrors, result.letterTemplate, result.contentScore);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-neutral-100 flex flex-col font-['Cairo',sans-serif]" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0f1115]/90 border-b border-neutral-800/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>مصحح التعبير واللغة العربية الفصحى</span>
              <span className="text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                سلم الدرجات المعتمد
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              تفريغ فوري للنصوص اليدوية، إبقاء الكلمة الخاطئة بخط أحمر، وعرض التصحيح عند تمرير الفأرة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-neutral-400" />
              <span>طباعة التقرير</span>
            </button>
          )}

          <button
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition cursor-pointer"
            title="إعادة ضبط"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Error notification banner */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="space-y-1">
              <strong className="block font-bold">تنبيه أثناء المعالجة:</strong>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* 1. Step 1: Upload / Capture (ارفع صورة او التقط) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>ارفع صورة المقال أو التقط صورة بالكاميرا</span>
            </h2>
            <span className="text-xs text-neutral-400">يدعم السحب والإفلات، الكاميرا المباشرة، والنماذج الجاهزة</span>
          </div>

          <ImageUploader
            onImageSelected={handleImageSelected}
            isLoading={isLoading}
            onClear={handleClear}
            currentImage={currentImage}
            essayTopic={essayTopic}
            setEssayTopic={setEssayTopic}
          />
        </section>

        {/* 2. Step 2: Instant Correction & Line Preservation (بعدها التصحيح مع الخط الأحمر) */}
        {result && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800/80 pt-6">
              <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span>التصحيح التفاعلي للنص (تحت الكلمة الخاطئة خط أحمر - مرر الفأرة لمعرفة الصحيح)</span>
              </h2>

              {/* View mode toggle tabs */}
              <div className="flex items-center bg-black/60 p-1 rounded-xl border border-neutral-800 text-xs">
                <button
                  onClick={() => setViewMode('correction')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'correction'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>لوحة التصحيح التفاعلية</span>
                </button>

                {currentImage && (
                  <button
                    onClick={() => setViewMode('sideBySide')}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                      viewMode === 'sideBySide'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>مطابقة الصورة مع النص</span>
                  </button>
                )}

                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>جدول الأخطاء ({result.errors.length})</span>
                </button>
              </div>
            </div>

            {/* Display according to view mode */}
            {viewMode === 'correction' && (
              <CorrectedTextViewer
                rawText={result.rawTranscribedText}
                studentUnderlinedText={result.studentTextWithUnderlinedErrors}
                correctedHtml={result.correctedHtmlText}
                correctedPlain={result.correctedPlainText}
                actualWordCount={result.actualWordCount}
                errors={result.errors}
              />
            )}

            {viewMode === 'sideBySide' && currentImage && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="h-[620px]">
                  <ImageViewer imageUrl={currentImage} title="صورة المقال الأصلية" />
                </div>
                <div className="h-[620px] overflow-y-auto">
                  <CorrectedTextViewer
                    rawText={result.rawTranscribedText}
                    studentUnderlinedText={result.studentTextWithUnderlinedErrors}
                    correctedHtml={result.correctedHtmlText}
                    correctedPlain={result.correctedPlainText}
                    actualWordCount={result.actualWordCount}
                    errors={result.errors}
                  />
                </div>
              </div>
            )}

            {viewMode === 'table' && (
              <ErrorTable
                errors={result.errors}
                onAddError={handleAddError}
                onRemoveError={handleRemoveError}
              />
            )}
          </section>
        )}

        {/* 3. Step 3: Rubric Result & Official Score (تحت يظهر النتيجة) */}
        {result && (
          <section className="space-y-4 border-t border-neutral-800/80 pt-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-neutral-200 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                  3
                </span>
                <span>نتيجة التقييم الرسمية وسلم الدرجات المعتمد</span>
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                الدرجة الإجمالية: <strong className="text-emerald-400 font-bold">{result.totalScore} / 20</strong>
              </span>
            </div>

            <RubricScoreCard
              result={result}
              onUpdateContentScore={handleUpdateContentScore}
              onUpdateLetterTemplate={handleUpdateLetterTemplate}
            />
          </section>
        )}
      </main>

      {/* Print Report Modal */}
      {result && (
        <PrintReportModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          result={result}
          essayTopic={essayTopic}
        />
      )}
    </div>
  );
}
