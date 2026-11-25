import { CorrectionError, RuleGroup } from '../types';

/**
 * Normalizes rule name into standard Arabic orthography rule categories
 * to ensure errors belonging to the same rule (e.g. همزة الوصل) are accurately merged.
 */
export function normalizeRuleName(rule: string = ''): string {
  if (!rule || typeof rule !== 'string') return 'قواعد إملائية عامة';
  const r = rule.trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه');

  if (r.includes('وصل')) return 'همزة الوصل';
  if (r.includes('قطع')) return 'همزة القطع';
  if (r.includes('تاء') || r.includes('مربوط') || r.includes('مفتوح') || r.includes('هاء')) return 'التاء المربوطة والمفتوحة والهاء';
  if (r.includes('تنوين') || r.includes('نصب') || r.includes('نون')) return 'تنوين النصب وحركات التنوين';
  if (r.includes('متوسط')) return 'الهمزة المتوسطة';
  if (r.includes('متطرف')) return 'الهمزة المتطرفة';
  if (r.includes('الف لين') || r.includes('الف مقصور') || r.includes('ممدود')) return 'الألف اللينة والمقصورة';
  if (r.includes('واو الجماع') || r.includes('الف فارق')) return 'الألف الفارقة وواو الجماعة';
  if (r.includes('حذف') || r.includes('زياد') || r.includes('مد')) return 'حذف وزيادة الحروف';
  if (r.includes('ترقيم') || r.includes('فاصل') || r.includes('نقط')) return 'علامات الترقيم';
  if (r.includes('اعراب') || r.includes('نحو') || r.includes('فاعل') || r.includes('مفعول') || r.includes('مجرور') || r.includes('منصوب')) {
    return 'قواعد النحو والإعراب';
  }
  if (r.includes('صرف') || r.includes('اشتقاق') || r.includes('وزن')) return 'قواعد الصرف والاشتقاق';

  return rule.trim();
}

/**
 * Accurately counts Arabic words in a text:
 * - Excludes lone punctuation marks (.,،؛:!؟-«»"').
 * - Preserves line breaks and tokens with actual letters.
 */
export function countArabicWords(text: string): number {
  if (!text || typeof text !== 'string') return 0;
  // Remove HTML tags
  const clean = text.replace(/<[^>]*>/g, ' ');
  // Split by whitespace
  const tokens = clean.trim().split(/\s+/);
  // Filter tokens that contain at least one Arabic/alphanumeric letter
  const words = tokens.filter(t => {
    // Strip common punctuation marks
    const stripped = t.replace(/[.,،؛:!?؟()[\]{}"'«»\-—ـ\\/+=<>*#@~`^&%$]/g, '');
    return stripped.length > 0;
  });
  return words.length;
}

/**
 * Groups errors by orthographic rule for clear categorization,
 * counting every single mistake directly without deduplicating repeated rules:
 * "احذف هذه القاعدة لانه يطبقها بشكل خاطئ خليه يحسب كل الغلطات"
 */
export function groupAndDeduplicateErrors(errors: CorrectionError[]): {
  totalRawErrors: number;
  calculatedMistakes: number;
  ruleGroups: RuleGroup[];
} {
  const groupsMap = new Map<string, CorrectionError[]>();

  errors.forEach(err => {
    const rawRule = err.ruleCategory || err.typeName || 'قواعد إملائية عامة';
    const normalizedKey = normalizeRuleName(rawRule);
    if (!groupsMap.has(normalizedKey)) {
      groupsMap.set(normalizedKey, []);
    }
    groupsMap.get(normalizedKey)!.push({
      ...err,
      ruleCategory: normalizedKey
    });
  });

  const ruleGroups: RuleGroup[] = [];

  groupsMap.forEach((groupErrors, ruleName) => {
    // Count all mistakes directly without discounting repeated rule errors
    ruleGroups.push({
      ruleName,
      count: groupErrors.length,
      errors: groupErrors,
      countedMistakes: groupErrors.length
    });
  });

  // Sort groups by highest error count first
  ruleGroups.sort((a, b) => b.count - a.count);

  return {
    totalRawErrors: errors.length,
    calculatedMistakes: errors.length,
    ruleGroups
  };
}

/**
 * Calculates language score counting all errors:
 * - 10: <= 5 أخطاء
 * - 8: 6 إلى 9 أخطاء
 * - 6: 10 إلى 19 خطأً
 * - 4: 20 خطأً أو أكثر
 */
export function calculateLanguageScoreWithRules(
  calculatedMistakes: number,
  totalRawErrors: number,
  ruleGroups: RuleGroup[],
  letterCheck?: {
    isLetter: boolean;
    hasSenderReceiverBox: boolean;
    hasIntroduction: boolean;
    hasConclusion: boolean;
  }
): {
  baseScore: number;
  deduction: number;
  finalScore: number;
  reason: string;
  missingElements: string[];
} {
  let baseScore = 10;
  let errorBracketReason = '';

  // Every single error is counted directly against the score ladder
  const errorsToCount = calculatedMistakes || totalRawErrors;

  if (errorsToCount <= 5) {
    baseScore = 10;
    errorBracketReason = `حصل على 10 درجات كاملة في اللغة لأن إجمالي الأخطاء (${errorsToCount} أخطاء) بحد أقصى 5 أخطاء.`;
  } else if (errorsToCount <= 9) {
    baseScore = 8;
    errorBracketReason = `حصل على 8 درجات في اللغة لوجود (${errorsToCount}) أخطاء (بين 6 إلى 9 أخطاء).`;
  } else if (errorsToCount <= 19) {
    baseScore = 6;
    errorBracketReason = `حصل على 6 درجات في اللغة لوجود (${errorsToCount}) خطأً (بين 10 إلى 19 خطأً).`;
  } else {
    baseScore = 4;
    errorBracketReason = `حصل على 4 درجات في اللغة لوجود (${errorsToCount}) خطأً (20 خطأً أو أكثر).`;
  }

  const missingElements: string[] = [];
  let deduction = 0;

  if (letterCheck && letterCheck.isLetter) {
    if (!letterCheck.hasSenderReceiverBox) missingElements.push('مربع وبيانات المرسل والمستلم');
    if (!letterCheck.hasIntroduction) missingElements.push('المقدمة (التحية الافتتاحية)');
    if (!letterCheck.hasConclusion) missingElements.push('الخاتمة (العبارة الختامية)');

    if (missingElements.length > 0) {
      deduction = 1;
    }
  }

  const finalScore = Math.max(0, baseScore - deduction);

  let reason = errorBracketReason;
  if (deduction > 0) {
    reason += ` وخصمت درجة واحدة (-1) لعدم استيفاء عناصر قالب الرسالة: (${missingElements.join('، ')}). وبذلك تصبح الدرجة ${finalScore} من 10.`;
  }

  return {
    baseScore,
    deduction,
    finalScore,
    reason,
    missingElements,
  };
}

/**
 * Strips Arabic diacritics / tashkeel for resilient matching
 */
export function stripTashkeel(s: string = ''): string {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Builds the interactive HTML text maintaining the student's original lines and words,
 * with misspelled words kept intact, clearly UNDERLINED IN RED, ready for hover correction:
 * "وابقي الكلمة الخاطئة لكن تحتها خط واذا وضعت الموس عليها يظهر الصحيح"
 */
export function buildStudentTextWithUnderlines(
  rawTranscribedText: string,
  errors: CorrectionError[]
): string {
  if (!rawTranscribedText) return '';
  if (!errors || errors.length === 0) return rawTranscribedText;

  let processed = rawTranscribedText;
  const placeholders: Array<{ err: CorrectionError; word: string }> = [];

  // Sort errors by length of original word descending to prevent substring collisions
  const sortedErrors = [...errors].sort(
    (a, b) => (b.originalWord?.length || 0) - (a.originalWord?.length || 0)
  );

  const baseLetter = '[\\u0621-\\u064A\\u0671-\\u06D3\\p{L}\\p{N}]';
  const diacritics = '[\\u064B-\\u065F\\u0670]*';

  for (const err of sortedErrors) {
    if (!err.originalWord) continue;
    const rawOrig = String(err.originalWord).trim();
    if (!rawOrig) continue;

    // Handle slash alternatives like "هواؤه / هوائه"
    const candidates = rawOrig.split(/\s*[\/|]\s*/).filter(Boolean);

    for (const cand of candidates) {
      const cleanCand = stripTashkeel(cand).trim().replace(/^[.,،؛:!?«»"()\-]+/g, '').replace(/[.,،؛:!?«»"()\-]+$/g, '');
      if (!cleanCand) continue;

      // Build diacritic-insensitive pattern
      const chars = cleanCand.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = chars.join(diacritics) + diacritics;

      // 1. Direct word match with Arabic letter boundary
      const exactRegex = new RegExp(`(?<!${baseLetter})(${pattern})(?!${baseLetter})`, 'gu');

      let matched = false;
      processed = processed.replace(exactRegex, (match) => {
        matched = true;
        const idx = placeholders.length;
        placeholders.push({ err, word: match });
        return `__ERR_SLOT_${idx}__`;
      });

      // 2. If not matched, try with attached conjunctions/prepositions (و، ف، ب، ك، ل، لل)
      if (!matched && cleanCand.length > 2) {
        const prefixRegex = new RegExp(`(?<!${baseLetter})([وفبكل]|لل)(${pattern})(?!${baseLetter})`, 'gu');
        processed = processed.replace(prefixRegex, (_, prefix, match) => {
          const idx = placeholders.length;
          placeholders.push({ err, word: match });
          return `${prefix}__ERR_SLOT_${idx}__`;
        });
      }
    }
  }

  // Restore placeholders into styled HTML <u> elements with guaranteed inline styles for RED UNDERLINE
  for (let i = 0; i < placeholders.length; i++) {
    const { err, word } = placeholders[i];
    const escapedCorrected = String(err.correctedWord || '').replace(/"/g, '&quot;');
    const escapedRule = String(err.ruleCategory || err.typeName || 'قواعد إملائية فصحى').replace(/"/g, '&quot;');
    const escapedExpl = String(err.explanation || '').replace(/"/g, '&quot;');
    const escapedOrig = String(word).replace(/"/g, '&quot;');

    const tag = `<u class="student-error-word" data-err-id="${err.id}" data-original="${escapedOrig}" data-corrected="${escapedCorrected}" data-rule="${escapedRule}" data-explanation="${escapedExpl}" style="text-decoration: underline !important; text-decoration-color: #ef4444 !important; -webkit-text-decoration-color: #ef4444 !important; text-decoration-style: solid !important; text-decoration-thickness: 3px !important; text-underline-offset: 6px !important; border-bottom: 3px solid #ef4444 !important; color: #f87171 !important; background-color: rgba(239, 68, 68, 0.16) !important; padding: 2px 5px !important; margin: 0 1px !important; border-radius: 4px !important; font-weight: bold !important; cursor: pointer !important; display: inline !important;">${word}</u>`;
    processed = processed.replace(`__ERR_SLOT_${i}__`, tag);
  }

  return processed;
}
